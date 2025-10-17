import type { NextRequest } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { stripHtml } from "@/lib/search"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { resolveSearchIndex, type AlgoliaSortMode, type AlgoliaSearchRecord } from "@/lib/algolia/client"
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

const buildFallbackResponse = (
  query: string,
  page: number,
  perPage: number,
): Record<string, unknown> => {
  const filtered = FALLBACK_RECORDS.filter((record) =>
    record.title.toLowerCase().includes(query.toLowerCase()) ||
    record.excerpt.toLowerCase().includes(query.toLowerCase()),
  )

  const start = (page - 1) * perPage
  const results = filtered.slice(start, start + perPage)
  const total = filtered.length

  return {
    results,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    currentPage: page,
    hasMore: start + results.length < total,
    suggestions: results.map((result) => result.title).slice(0, 5),
    performance: {
      responseTime: 0,
      source: "fallback",
    },
  }
}

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
  const query = searchParams.get("q") || searchParams.get("query")

  if (!query) {
    return jsonWithCors(request, { error: "Missing search query" }, { status: 400 })
  }

  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))
  const perPage = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("per_page") || "20", 10)))
  const scope = parseScope(searchParams.get("country") || searchParams.get("scope"))
  const sort = parseSort(searchParams.get("sort"))
  const suggestionsOnly = searchParams.get("suggestions") === "true"

  const searchIndex = resolveSearchIndex(scope, sort)

  if (suggestionsOnly) {
    if (!searchIndex) {
      try {
        const suggestions = await wpGetSearchSuggestions(query)
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
      const response = await searchIndex.search<AlgoliaSearchRecord>(query, {
        page: 0,
        hitsPerPage: 10,
        attributesToRetrieve: ["title"],
      })

      const suggestions = Array.from(new Set(response.hits.map((hit) => hit.title))).slice(0, 10)

      return jsonWithCors(request, {
        suggestions,
        performance: {
          responseTime: Date.now() - startTime,
          source: `algolia-${sort}`,
        },
      })
    } catch (error) {
      console.error("Algolia suggestion search failed", error)
      try {
        const suggestions = await wpGetSearchSuggestions(query)
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
    try {
      const wpResults = await wpSearchPosts(query, { page, perPage })
      const records = fromWordPressResults(wpResults, scope.type === "country" ? scope.country : DEFAULT_COUNTRY)
      return jsonWithCors(request, {
        results: records,
        total: wpResults.total,
        totalPages: wpResults.totalPages,
        currentPage: wpResults.currentPage,
        hasMore: wpResults.hasMore,
        query,
        suggestions: records.map((record) => record.title).slice(0, 10),
        performance: {
          responseTime: Date.now() - startTime,
          source: "wordpress",
        },
      })
    } catch (error) {
      console.error("WordPress search fallback failed", error)
      return jsonWithCors(request, buildFallbackResponse(query, page, perPage))
    }
  }

  try {
    const response = await searchIndex.search<AlgoliaSearchRecord>(query, {
      page: page - 1,
      hitsPerPage: perPage,
      attributesToRetrieve: ["objectID", "title", "excerpt", "categories", "country", "published_at"],
    })

    const mappedHits = mapAlgoliaHits(response.hits as AlgoliaSearchRecord[])
    const total = response.nbHits
    const totalPages = Math.max(1, response.nbPages)

    return jsonWithCors(request, {
      results: mappedHits,
      total,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages,
      query,
      suggestions: mappedHits.map((hit) => hit.title).slice(0, 10),
      performance: {
        responseTime: Date.now() - startTime,
        source: `algolia-${scope.type === "country" ? scope.country : "pan"}-${sort}`,
      },
    })
  } catch (error) {
    console.error("Algolia search failed", error)

    try {
      const wpResults = await wpSearchPosts(query, { page, perPage })
      const records = fromWordPressResults(wpResults, scope.type === "country" ? scope.country : DEFAULT_COUNTRY)

      return jsonWithCors(request, {
        results: records,
        total: wpResults.total,
        totalPages: wpResults.totalPages,
        currentPage: wpResults.currentPage,
        hasMore: wpResults.hasMore,
        query,
        suggestions: records.map((record) => record.title).slice(0, 10),
        performance: {
          responseTime: Date.now() - startTime,
          source: "wordpress-fallback",
        },
      })
    } catch (wpError) {
      console.error("WordPress fallback failed", wpError)
      return jsonWithCors(request, buildFallbackResponse(query, page, perPage))
    }
  }
}
