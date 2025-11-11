import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import type { SearchRecord } from "@/types/search"

import { normalizeBaseSearchParams, type NormalizedBaseSearchParams } from "./shared"
import { executeWordPressSearchForScope } from "./wordpress-fallback"

export { MAX_PAGES_PER_COUNTRY } from "./wordpress-fallback"

export const runtime = "nodejs"
export const revalidate = 30
const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW = 60 * 1000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const jsonWithNoStore = (request: NextRequest, data: any, init?: ResponseInit) => {
  const response = jsonWithCors(request, data, init)
  response.headers.set("Cache-Control", "no-store")
  return response
}

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

type NormalizedSearchParams = NormalizedBaseSearchParams & {
  page: number
  perPage: number
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

const normalizeSearchParams = (searchParams: URLSearchParams): NormalizedSearchParams => {
  const baseParams = normalizeBaseSearchParams(searchParams)
  const page = normalizeIntegerParam(searchParams.get("page"), { fallback: 1, min: 1 })
  const perPage = normalizeIntegerParam(searchParams.get("per_page"), { fallback: 20, min: 1, max: 100 })
  return { ...baseParams, page, perPage }
}

const FULL_SEARCH_CACHE_HEADER = "private, no-store, no-cache, must-revalidate"

const respondWithSearch = (request: NextRequest, body: unknown, init?: ResponseInit) => {
  const response = jsonWithCors(request, body, init)
  response.headers.set("Cache-Control", FULL_SEARCH_CACHE_HEADER)
  return response
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

const buildWordPressResponse = (
  request: NextRequest,
  params: NormalizedSearchParams,
  startTime: number,
  result: Awaited<ReturnType<typeof executeWordPressSearchForScope>>,
) =>
  respondWithSearch(request, {
    results: result.results,
    total: result.total,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    hasMore: result.hasMore,
    query: params.query,
    suggestions: result.suggestions,
    performance: {
      responseTime: Date.now() - startTime,
      source: "wordpress",
      wordpressRequestCount: result.performance.totalRequests,
      wordpressRequestBudget: result.performance.requestBudget,
      wordpressBudgetExhausted: result.performance.budgetExhausted,
      wordpressSearchElapsed: result.performance.elapsedMs,
    },
  })

export async function GET(request: NextRequest) {
  logRequest(request)
  const startTime = Date.now()

  const rateLimitCheck = checkRateLimit(request)
  if (rateLimitCheck.limited) {
    return respondWithSearch(
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
    return respondWithSearch(request, { error: "Missing search query" }, { status: 400 })
  }

  try {
    const result = await executeWordPressSearchForScope(
      normalizedParams.query,
      normalizedParams.scope,
      normalizedParams.page,
      normalizedParams.perPage,
    )

    return buildWordPressResponse(request, normalizedParams, startTime, result)
  } catch (error) {
    console.error("WordPress search failed", error)
  }

  return respondWithSearch(request, buildFallbackResponse(normalizedParams, startTime))
}

export const searchGET = GET
