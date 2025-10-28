import type { NextRequest } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { stripHtml } from "@/lib/search"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import {
  resolveSearchIndex,
  type AlgoliaSortMode,
  type AlgoliaSearchRecord,
} from "@/lib/algolia/client"
import { searchWordPressPosts as wpSearchPosts, getSearchSuggestions as wpGetSearchSuggestions } from "@/lib/wordpress-search"
import type { SearchRecord } from "@/types/search"

export const runtime = "nodejs"
export const revalidate = 0

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()
const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW = 60 * 1000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const FALLBACK_RECORDS: SearchRecord[] = [
  {
    objectID: "sz:welcome-to-news-on-africa",
    title: "Welcome to News On Africa",
    excerpt: "Your premier source for African news, politics, business, and culture.",
    categories: [],
    country: "sz",
    published_at: new Date().toISOString(),
  },
  {
    objectID: "sz:search-service-info",
    title: "Search Service Information",
    excerpt: "Our search is powered by WordPress and provides comprehensive coverage of African news.",
    categories: [],
    country: "sz",
    published_at: new Date().toISOString(),
  },
]

const supportedCountryCodes = new Set(SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase()))

type SearchScope = { type: "country"; country: string } | { type: "panAfrican" }

type NormalizedSearchParams = {
  query: string
  page: number
  perPage: number
  sort: AlgoliaSortMode
  scope: SearchScope
  suggestionsOnly: boolean
}

const getRateLimitKey = (request: NextRequest): string => {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  return `search:${ip}`
}

const checkRateLimit = (request: NextRequest): { limited: boolean; retryAfter?: number } => {
  if (process.env.NODE_ENV === "development") {
    return { limited: false }
  }

  const key = getRateLimitKey(request)
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { limited: false }
  }

  if (now > entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + RATE_LIMIT_WINDOW
    return { limited: false }
  }

  if (entry.count >= RATE_LIMIT) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count += 1
  return { limited: false }
}

const parseScope = (value: string | null | undefined): SearchScope => {
  if (!value) {
    return { type: "country", country: DEFAULT_COUNTRY }
  }

  const normalized = value.trim().toLowerCase()

  if (["all", "pan", "africa", "pan-africa", "african"].includes(normalized)) {
    return { type: "panAfrican" }
  }

  if (supportedCountryCodes.has(normalized)) {
    return { type: "country", country: normalized }
  }

  return { type: "country", country: DEFAULT_COUNTRY }
}

const SORT_ALIASES: Record<string, AlgoliaSortMode> = {
  latest: "latest",
  recent: "latest",
  newest: "latest",
}

const parseSort = (value: string | null | undefined): AlgoliaSortMode => {
  if (!value) {
    return "relevance"
  }

  const normalized = value.trim().toLowerCase()

  if (normalized in SORT_ALIASES) {
    return SORT_ALIASES[normalized]
  }

  return "relevance"
}

const normalizeBooleanParam = (value: string | null): boolean => {
  if (!value) {
    return false
  }

  const normalized = value.trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(normalized)
}

const normalizeIntegerParam = (
  value: string | null,
  { fallback, min, max }: { fallback: number; min: number; max?: number },
): number => {
  const parsed = Number.parseInt(value ?? "", 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  const clamped = Math.max(min, parsed)
  return typeof max === "number" ? Math.min(clamped, max) : clamped
}

const normalizeQuery = (value: string | null): string => (value ?? "").replace(/\s+/g, " ").trim()

const normalizeSearchParams = (searchParams: URLSearchParams): NormalizedSearchParams => {
  const query = normalizeQuery(searchParams.get("q") ?? searchParams.get("query"))
  const page = normalizeIntegerParam(searchParams.get("page"), { fallback: 1, min: 1 })
  const perPage = normalizeIntegerParam(searchParams.get("per_page"), { fallback: 20, min: 1, max: 100 })
  const sort = parseSort(searchParams.get("sort"))
  const scope = parseScope(searchParams.get("country") ?? searchParams.get("scope"))
  const suggestionsOnly = normalizeBooleanParam(searchParams.get("suggestions"))

  return { query, page, perPage, sort, scope, suggestionsOnly }
}

const fromWordPressResults = (
  results: Awaited<ReturnType<typeof wpSearchPosts>>,
  country: string,
): SearchRecord[] =>
  results.results.map((post) => ({
    objectID: `${country}:${post.slug || post.id}`,
    title: stripHtml(post.title?.rendered || "").trim() || post.title?.rendered || "Untitled",
    excerpt: stripHtml(post.excerpt?.rendered || "").trim(),
    categories:
      post._embedded?.["wp:term"]?.[0]?.map((term) => term.name)?.filter((name): name is string => Boolean(name)) || [],
    country,
    published_at: new Date(post.date || new Date().toISOString()).toISOString(),
  }))

type WordPressScopeResult = {
  results: SearchRecord[]
  total: number
  totalPages: number
  currentPage: number
  hasMore: boolean
  suggestions: string[]
}

const uniqueSuggestions = (records: SearchRecord[]): string[] =>
  Array.from(new Set(records.map((record) => record.title).filter(Boolean))).slice(0, 10)

const executeWordPressSearchForScope = async (
  query: string,
  scope: SearchScope,
  page: number,
  perPage: number,
): Promise<WordPressScopeResult> => {
  const safePage = Math.max(1, page)
  const safePerPage = Math.max(1, perPage)

  if (scope.type === "panAfrican") {
    const desiredTotal = safePage * safePerPage
    const countryCount = Math.max(1, SUPPORTED_COUNTRIES.length)
    const basePerCountry = Math.ceil(desiredTotal / countryCount)
    const buffer = Math.max(2, Math.ceil(basePerCountry * 0.1))
    const perCountryFetchSize = Math.min(100, Math.max(1, basePerCountry + buffer))
    type HeapNode = { record: SearchRecord; timestamp: number }

    const heap: HeapNode[] = []
    const maxHeapSize = Math.max(1, desiredTotal)
    let total = 0
    const suggestionSet = new Set<string>()
    const countryTotals = new Map<string, number>()

    const siftUp = (index: number) => {
      let current = index
      while (current > 0) {
        const parent = Math.floor((current - 1) / 2)
        if (heap[current].timestamp >= heap[parent].timestamp) {
          break
        }
        ;[heap[current], heap[parent]] = [heap[parent], heap[current]]
        current = parent
      }
    }

    const siftDown = (index: number) => {
      let current = index
      const length = heap.length

      while (true) {
        const left = current * 2 + 1
        const right = left + 1
        let smallest = current

        if (left < length && heap[left].timestamp < heap[smallest].timestamp) {
          smallest = left
        }

        if (right < length && heap[right].timestamp < heap[smallest].timestamp) {
          smallest = right
        }

        if (smallest === current) {
          break
        }

        ;[heap[current], heap[smallest]] = [heap[smallest], heap[current]]
        current = smallest
      }
    }

    const addToHeap = (record: SearchRecord) => {
      const timestamp = new Date(record.published_at ?? 0).getTime()
      const node: HeapNode = { record, timestamp }

      if (heap.length < maxHeapSize) {
        heap.push(node)
        siftUp(heap.length - 1)
        return
      }

      if (heap[0].timestamp >= timestamp) {
        return
      }

      heap[0] = node
      siftDown(0)
    }

    const addSuggestion = (title: string | undefined) => {
      if (!title) {
        return
      }

      if (suggestionSet.has(title) || suggestionSet.size < 10) {
        suggestionSet.add(title)
      }
    }

    type CountryState = {
      code: string
      nextPage: number
      hasMore: boolean
      oldestTimestampFetched?: number
    }

    const fetchAndProcessPage = async (state: CountryState, pageToFetch: number) => {
      const response = await wpSearchPosts(query, {
        page: pageToFetch,
        perPage: perCountryFetchSize,
        country: state.code,
      })
      const records = fromWordPressResults(response, state.code)

      if (!countryTotals.has(state.code)) {
        total += response.total
        countryTotals.set(state.code, response.total)
      }

      let pageOldestTimestamp: number | undefined

      records.forEach((record) => {
        addToHeap(record)
        addSuggestion(record.title)
        const timestamp = new Date(record.published_at ?? 0).getTime()
        pageOldestTimestamp = typeof pageOldestTimestamp === "number"
          ? Math.min(pageOldestTimestamp, timestamp)
          : timestamp
      })

      if (typeof pageOldestTimestamp === "number") {
        state.oldestTimestampFetched = typeof state.oldestTimestampFetched === "number"
          ? Math.min(state.oldestTimestampFetched, pageOldestTimestamp)
          : pageOldestTimestamp
      }

      state.nextPage = response.currentPage + 1
      state.hasMore = response.hasMore
      return records.length
    }

    const countryStates: CountryState[] = SUPPORTED_COUNTRIES.map((country) => ({
      code: country.code.toLowerCase(),
      nextPage: 1,
      hasMore: true,
    }))

    await Promise.all(
      countryStates.map(async (state) => {
        await fetchAndProcessPage(state, 1)
      }),
    )

    while (true) {
      const statesWithMore = countryStates.filter((state) => state.hasMore)

      if (statesWithMore.length === 0) {
        break
      }

      const heapOldestTimestamp = heap[0]?.timestamp ?? Number.NEGATIVE_INFINITY
      const shouldContinue =
        heap.length < desiredTotal ||
        statesWithMore.some((state) => {
          const oldestForCountry = state.oldestTimestampFetched
          return typeof oldestForCountry === "number" && oldestForCountry > heapOldestTimestamp
        })

      if (!shouldContinue) {
        break
      }

      const additions = await Promise.all(
        statesWithMore.map((state) => fetchAndProcessPage(state, state.nextPage)),
      )

      const addedRecords = additions.reduce((sum, count) => sum + count, 0)

      if (addedRecords === 0) {
        break
      }
    }

    const getRecordTimestamp = (record: SearchRecord) => new Date(record.published_at ?? 0).getTime()

    const sortedRecords = heap
      .map((entry) => entry.record)
      .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a))

    const startIndex = (safePage - 1) * safePerPage
    const paginatedRecords = sortedRecords.slice(startIndex, startIndex + safePerPage)
    const totalPages = Math.max(1, Math.ceil(total / safePerPage))

    return {
      results: paginatedRecords,
      total,
      totalPages,
      currentPage: safePage,
      hasMore: safePage < totalPages,
      suggestions: Array.from(suggestionSet),
    }
  }

  const countryCode = scope.country
  const response = await wpSearchPosts(query, { page: safePage, perPage: safePerPage, country: countryCode })
  const records = fromWordPressResults(response, countryCode)

  return {
    results: records,
    total: response.total,
    totalPages: response.totalPages,
    currentPage: response.currentPage,
    hasMore: response.hasMore,
    suggestions: uniqueSuggestions(records),
  }
}

const buildFallbackResponse = (
  params: NormalizedSearchParams,
  startTime: number,
): Record<string, unknown> => {
  if (!params.query) {
    return {
      results: [],
      total: 0,
      totalPages: 1,
      currentPage: params.page,
      hasMore: false,
      query: params.query,
      suggestions: [],
      performance: {
        responseTime: Date.now() - startTime,
        source: "fallback",
      },
    }
  }

  const filtered = FALLBACK_RECORDS.filter((record) => {
    const haystack = `${record.title} ${record.excerpt}`.toLowerCase()
    return haystack.includes(params.query.toLowerCase())
  })

  const start = (params.page - 1) * params.perPage
  const results = filtered.slice(start, start + params.perPage)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / params.perPage))

  return {
    results,
    total,
    totalPages,
    currentPage: Math.min(params.page, totalPages),
    hasMore: start + results.length < total,
    query: params.query,
    suggestions: results.map((result) => result.title).slice(0, 5),
    performance: {
      responseTime: Date.now() - startTime,
      source: "fallback",
    },
  }
}

const mapAlgoliaHits = (hits: AlgoliaSearchRecord[], fallbackCountry: string): SearchRecord[] =>
  hits.map((hit, index) => {
    const title = stripHtml(hit.title || "").trim() || hit.title || "Untitled"
    const excerpt = stripHtml(hit.excerpt || "").trim()
    const categories = Array.isArray(hit.categories)
      ? hit.categories.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
      : []
    const country = (hit.country || fallbackCountry || DEFAULT_COUNTRY).toLowerCase()
    const publishedAt = hit.published_at ? new Date(hit.published_at).toISOString() : undefined

    return {
      objectID: String(hit.objectID ?? `${country}:algolia-${index}`),
      title,
      excerpt,
      categories,
      country,
      published_at: publishedAt,
    }
  })

const buildWordPressOptions = (params: NormalizedSearchParams) => ({
  page: params.page,
  perPage: params.perPage,
  orderBy: params.sort === "latest" ? "date" : "relevance",
  order: "desc" as const,
})

export async function GET(request: NextRequest) {
  logRequest(request)
  const startTime = Date.now()

  const rateLimitCheck = checkRateLimit(request)
  if (rateLimitCheck.limited) {
    return jsonWithCors(
      request,
      {
        error: "Too many search requests",
        message: "Please try again later",
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimitCheck.retryAfter?.toString() || "60",
        },
      },
    )
  }

  const { searchParams } = new URL(request.url)
  const normalizedParams = normalizeSearchParams(searchParams)

  if (!normalizedParams.query) {
    return jsonWithCors(request, { error: "Missing search query" }, { status: 400 })
  }

  const scope = normalizedParams.scope
  const fallbackCountry = scope.type === "country" ? scope.country : DEFAULT_COUNTRY
  const searchIndex = resolveSearchIndex(scope, normalizedParams.sort)

  if (normalizedParams.suggestionsOnly) {
    if (!searchIndex) {
      if (scope.type === "panAfrican") {
        try {
          const fallback = await executeWordPressSearchForScope(
            normalizedParams.query,
            scope,
            1,
            10,
          )
          return jsonWithCors(request, {
            suggestions: fallback.suggestions,
            performance: {
              responseTime: Date.now() - startTime,
              source: "wordpress-fallback",
            },
          })
        } catch {
          return jsonWithCors(request, { suggestions: [] })
        }
      }

      try {
        const suggestions = await wpGetSearchSuggestions(
          normalizedParams.query,
          10,
          scope.type === "country" ? scope.country : undefined,
        )
        return jsonWithCors(request, {
          suggestions,
          performance: {
            responseTime: Date.now() - startTime,
            source: "wordpress-fallback",
          },
        })
      } catch {
        return jsonWithCors(request, { suggestions: [] })
      }
    }

    try {
      const response = await searchIndex.search<AlgoliaSearchRecord>(normalizedParams.query, {
        page: 0,
        hitsPerPage: 10,
        attributesToRetrieve: ["title"],
      })

      const suggestions = Array.from(new Set(response.hits.map((hit) => hit.title))).slice(0, 10)

      return jsonWithCors(request, {
        suggestions,
        performance: {
          responseTime: Date.now() - startTime,
          source: `algolia-${normalizedParams.sort}`,
        },
      })
    } catch (error) {
      console.error("Algolia suggestion search failed", error)
      try {
        const suggestions = await wpGetSearchSuggestions(normalizedParams.query)
        return jsonWithCors(request, {
          suggestions,
          performance: {
            responseTime: Date.now() - startTime,
            source: "wordpress-fallback",
          },
        })
      } catch {
        return jsonWithCors(request, { suggestions: [] })
      }
    }
  }

  if (!searchIndex) {
    if (scope.type === "panAfrican") {
      try {
        const fallback = await executeWordPressSearchForScope(
          normalizedParams.query,
          scope,
          normalizedParams.page,
          normalizedParams.perPage,
        )

        return jsonWithCors(request, {
          results: fallback.results,
          total: fallback.total,
          totalPages: fallback.totalPages,
          currentPage: fallback.currentPage,
          hasMore: fallback.hasMore,
          query: normalizedParams.query,
          suggestions: fallback.suggestions,
          performance: {
            responseTime: Date.now() - startTime,
            source: "wordpress",
          },
        })
      } catch (error) {
        console.error("WordPress pan-African fallback failed", error)
        return jsonWithCors(request, buildFallbackResponse(normalizedParams, startTime))
      }
    }

    try {
      const wpResults = await wpSearchPosts(normalizedParams.query, buildWordPressOptions(normalizedParams))
      const records = fromWordPressResults(wpResults, fallbackCountry)
      return jsonWithCors(request, {
        results: records,
        total: wpResults.total,
        totalPages: Math.max(1, wpResults.totalPages || 1),
        currentPage: Math.max(1, wpResults.currentPage || normalizedParams.page),
        hasMore: wpResults.hasMore,
        query: normalizedParams.query,
        suggestions: records.map((record) => record.title).slice(0, 10),
        performance: {
          responseTime: wpResults.searchTime || Date.now() - startTime,
          source: "wordpress",
        },
      })
    } catch (error) {
      console.error("WordPress search fallback failed", error)
      return jsonWithCors(request, buildFallbackResponse(normalizedParams, startTime))
    }
  }

  try {
    const response = await searchIndex.search<AlgoliaSearchRecord>(normalizedParams.query, {
      page: normalizedParams.page - 1,
      hitsPerPage: normalizedParams.perPage,
      attributesToRetrieve: ["objectID", "title", "excerpt", "categories", "country", "published_at"],
    })

    const mappedHits = mapAlgoliaHits(response.hits as AlgoliaSearchRecord[], fallbackCountry)
    const total = typeof response.nbHits === "number" ? response.nbHits : mappedHits.length
    const totalPages = Math.max(1, response.nbPages || Math.ceil(total / normalizedParams.perPage))

    return jsonWithCors(request, {
      results: mappedHits,
      total,
      totalPages,
      currentPage: normalizedParams.page,
      hasMore: normalizedParams.page < totalPages,
      query: normalizedParams.query,
      suggestions: mappedHits.map((hit) => hit.title).slice(0, 10),
      performance: {
        responseTime: Date.now() - startTime,
        source: `algolia-${scope.type === "country" ? scope.country : "pan"}-${normalizedParams.sort}`,
      },
    })
  } catch (error) {
    console.error("Algolia search failed", error)

    try {
      const wpResults = await wpSearchPosts(normalizedParams.query, buildWordPressOptions(normalizedParams))
      const records = fromWordPressResults(wpResults, fallbackCountry)

      return jsonWithCors(request, {
        results: records,
        total: wpResults.total,
        totalPages: Math.max(1, wpResults.totalPages || 1),
        currentPage: Math.max(1, wpResults.currentPage || normalizedParams.page),
        hasMore: wpResults.hasMore,
        query: normalizedParams.query,
        suggestions: records.map((record) => record.title).slice(0, 10),
        performance: {
          responseTime: wpResults.searchTime || Date.now() - startTime,
          source: "wordpress-fallback",
        },
      })
    } catch (wpError) {
      console.error("WordPress fallback failed", wpError)
      return jsonWithCors(request, buildFallbackResponse(normalizedParams, startTime))
    }
  }
}
