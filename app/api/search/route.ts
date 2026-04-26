import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { searchContent } from "@/lib/supabase/search"

import { normalizeBaseSearchParams } from "./shared"

export const runtime = "nodejs"
export const revalidate = 0

const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW_SECONDS = 60

// In-process fallback used when Vercel KV is not configured.
const fallbackMap = new Map<string, { count: number; resetAt: number }>()

const getRateLimitKey = (request: NextRequest): string => {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  return `search-rl:${ip}`
}

async function checkRateLimit(request: NextRequest): Promise<{ limited: boolean; retryAfter?: number }> {
  if (process.env.NODE_ENV === "development") {
    return { limited: false }
  }

  const key = getRateLimitKey(request)

  // Distributed rate limiting via Vercel KV — works correctly across all
  // serverless function instances.
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import("@vercel/kv")
      const count = await kv.incr(key)
      if (count === 1) {
        await kv.expire(key, RATE_LIMIT_WINDOW_SECONDS)
      }
      if (count > RATE_LIMIT) {
        const ttl = await kv.ttl(key)
        return { limited: true, retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS }
      }
      return { limited: false }
    } catch (err) {
      console.warn("KV rate limit check failed, falling back to in-process", err)
    }
  }

  // Fallback: single-instance in-process map.
  const now = Date.now()
  const entry = fallbackMap.get(key)

  if (!entry) {
    fallbackMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 })
    return { limited: false }
  }

  if (now > entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + RATE_LIMIT_WINDOW_SECONDS * 1000
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

  const rateLimitCheck = await checkRateLimit(request)
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
