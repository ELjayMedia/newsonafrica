import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { searchContent } from "@/lib/supabase/search"

import { normalizeBaseSearchParams } from "./shared"

export const runtime = "nodejs"
export const revalidate = 0

const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW = 60 * 1000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const jsonWithNoStore = (request: NextRequest, data: any, init?: ResponseInit) => {
  const response = jsonWithCors(request, data, init)
  response.headers.set("Cache-Control", "no-store")
  return response
}

const FALLBACK_RECORDS: any[] = [
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
    excerpt: "Our search is powered by our GraphQL API and provides comprehensive coverage of African news.",
    categories: [],
    country: "sz",
    published_at: new Date().toISOString(),
  },
]

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

const respondWithSearch = (request: NextRequest, body: unknown, init?: ResponseInit) => {
  const response = jsonWithCors(request, body, init)
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate")
  return response
}

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
  const baseParams = normalizeBaseSearchParams(searchParams)
  const page = normalizeIntegerParam(searchParams.get("page"), { fallback: 1, min: 1 })
  const perPage = normalizeIntegerParam(searchParams.get("per_page"), {
    fallback: 20,
    min: 1,
    max: 100,
  })

  if (!baseParams.query) {
    return respondWithSearch(request, { error: "Missing search query" }, { status: 400 })
  }

  try {
    const edition = baseParams.scope.type === "country" ? baseParams.scope.country : undefined

    const result = await searchContent(baseParams.query, {
      edition,
      page,
      perPage,
    })

    return respondWithSearch(request, {
      ...result,
      query: baseParams.query,
      performance: {
        responseTime: Date.now() - startTime,
        source: "supabase-fts",
      },
    })
  } catch (error) {
    console.error("[v0] Search error:", error)

    return respondWithSearch(
      request,
      {
        results: [],
        total: 0,
        totalPages: 0,
        currentPage: page,
        hasMore: false,
        query: baseParams.query,
        suggestions: [],
        performance: {
          responseTime: Date.now() - startTime,
          source: "error",
        },
      },
      { status: 500 },
    )
  }
}
