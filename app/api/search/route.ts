import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { stripHtml } from "@/lib/search"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import {
  searchWordPressPosts as wpSearchPosts,
  getSearchSuggestions as wpGetSearchSuggestions,
} from "@/lib/wordpress-search"
import type { SearchRecord } from "@/types/search"

export const runtime = "nodejs"
export const revalidate = 0

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()
const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW = 60 * 1000

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const SUPPORTED_COUNTRY_CODES = new Set(
  SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase()),
)
const PAN_AFRICAN_VALUES = new Set(["all", "pan", "africa", "pan-africa", "african"])

const getRateLimitKey = (request: NextRequest): string => {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  return `search:${ip}`
}

const checkRateLimit = (
  request: NextRequest,
): { limited: boolean; retryAfter?: number } => {
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

const normalizeCountry = (value: string | null | undefined): string => {
  if (!value) {
    return DEFAULT_COUNTRY
  }

  const normalized = value.trim().toLowerCase()
  if (PAN_AFRICAN_VALUES.has(normalized)) {
    return DEFAULT_COUNTRY
  }

  if (SUPPORTED_COUNTRY_CODES.has(normalized)) {
    return normalized
  }

  return DEFAULT_COUNTRY
}

const parseNumberParam = (
  value: string | null,
  defaultValue: number,
  { min = 1, max = 50 }: { min?: number; max?: number } = {},
): number => {
  const parsed = value !== null ? Number(value) : defaultValue
  const safe = Number.isFinite(parsed) ? parsed : defaultValue
  const integer = Math.trunc(safe)
  return Math.min(max, Math.max(min, integer))
}

const toSearchRecord = (post: any, country: string): SearchRecord => {
  const title = stripHtml(post?.title?.rendered ?? "").trim()
  const excerpt = stripHtml(post?.excerpt?.rendered ?? "").trim()
  const categories =
    post?._embedded?.["wp:term"]?.[0]
      ?.map((term: { name?: string }) => term?.name)
      .filter((name: string | undefined): name is string => Boolean(name)) ?? []

  let publishedAt: string | undefined
  if (post?.date) {
    const timestamp = Date.parse(post.date)
    if (!Number.isNaN(timestamp)) {
      publishedAt = new Date(timestamp).toISOString()
    }
  }

  return {
    objectID: `${country}:${post?.slug || post?.id || randomUUID()}`,
    title: title || post?.title?.rendered || "Untitled",
    excerpt,
    categories,
    country,
    published_at: publishedAt,
  }
}

const buildEmptyResponse = (
  query: string,
  page: number,
  responseTime: number,
  suggestions: string[] = [],
) => ({
  results: [],
  total: 0,
  totalPages: 0,
  currentPage: page,
  hasMore: false,
  query,
  suggestions,
  performance: {
    responseTime,
    source: "fallback" as const,
  },
})

const resolveSort = (
  value: string | null,
): { orderBy: "relevance" | "date"; order: "asc" | "desc"; sort: "relevance" | "latest" } => {
  if (value === "latest") {
    return { orderBy: "date", order: "desc", sort: "latest" }
  }

  return { orderBy: "relevance", order: "desc", sort: "relevance" }
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
  const rawQuery = searchParams.get("q") || searchParams.get("query") || ""
  const query = rawQuery.trim()

  if (!query) {
    return jsonWithCors(request, { error: "Missing search query" }, { status: 400 })
  }

  const page = parseNumberParam(searchParams.get("page"), 1, { min: 1, max: 100 })
  const perPage = parseNumberParam(searchParams.get("per_page"), 20, { min: 1, max: 50 })
  const country = normalizeCountry(searchParams.get("country") || searchParams.get("scope"))
  const sort = resolveSort(searchParams.get("sort"))
  const suggestionsOnly = searchParams.get("suggestions") === "true"

  const loadSuggestions = async () => {
    try {
      const suggestions = await wpGetSearchSuggestions(query, 8, country)
      const values = Array.isArray(suggestions)
        ? suggestions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : []
      return {
        values,
        source: values.length > 0 ? ("wordpress" as const) : ("fallback" as const),
      }
    } catch (error) {
      console.error("WordPress suggestion search failed", error)
      return { values: [], source: "fallback" as const }
    }
  }

  if (suggestionsOnly) {
    const { values, source } = await loadSuggestions()
    return jsonWithCors(request, {
      suggestions: values,
      performance: {
        responseTime: Date.now() - startTime,
        source,
      },
    })
  }

  const suggestionsPromise = loadSuggestions()

  try {
    const wpResults = await wpSearchPosts(query, {
      page,
      perPage,
      country,
      orderBy: sort.orderBy,
      order: sort.order,
    })

    const records = wpResults.results.map((post) => toSearchRecord(post, country))
    const responseTime = Date.now() - startTime
    const { values: fetchedSuggestions } = await suggestionsPromise

    const fallbackSuggestions = records
      .map((record) => record.title)
      .filter((title) => title.length > 0)
      .slice(0, 10)
    const suggestions = fetchedSuggestions.length > 0 ? fetchedSuggestions : fallbackSuggestions

    return jsonWithCors(request, {
      results: records,
      total: wpResults.total,
      totalPages: wpResults.totalPages,
      currentPage: wpResults.currentPage,
      hasMore: wpResults.hasMore,
      query,
      suggestions,
      performance: {
        responseTime,
        source: "wordpress" as const,
      },
    })
  } catch (error) {
    console.error("WordPress search failed", error)
    const { values: suggestions } = await suggestionsPromise
    return jsonWithCors(
      request,
      buildEmptyResponse(query, page, Date.now() - startTime, suggestions),
    )
  }
}
