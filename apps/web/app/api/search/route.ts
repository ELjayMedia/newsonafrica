import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { searchWordPressPosts, type SearchResponse, type WordPressSearchResult } from "@/lib/wordpress-search"

import { normalizeBaseSearchParams } from "./shared"

export const runtime = "nodejs"
export const revalidate = 0
export const MAX_PAGES_PER_COUNTRY = 3

const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW_SECONDS = 60

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

const toSearchRecord = (post: WordPressSearchResult, country: string) => ({
  objectID: `${country}:${post.slug}`,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  published_at: post.date,
  date: post.date,
  country,
  categories: post.categories,
  tags: post.tags,
})

const compareByDateDesc = (a: { published_at?: string | null }, b: { published_at?: string | null }) => {
  const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
  const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
  return bTime - aTime
}

const calculatePerCountryFetchSize = (page: number, perPage: number, countryCount: number): number => {
  const desiredTotal = page * perPage
  const basePerCountry = Math.ceil(desiredTotal / Math.max(1, countryCount))
  return Math.min(100, Math.max(perPage, Math.max(1, basePerCountry + Math.max(2, Math.ceil(basePerCountry * 0.1)))))
}

const buildSuggestions = (records: Array<{ title?: string | null }>): string[] =>
  Array.from(new Set(records.map((record) => record.title).filter((title): title is string => Boolean(title)))).slice(0, 10)

const searchCountry = async (query: string, country: string, page: number, perPage: number) => {
  const response = await searchWordPressPosts(query, { country, page, perPage })
  return response
}

const searchPanAfrican = async (query: string, page: number, perPage: number) => {
  const countryCodes = SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase())
  const perCountry = calculatePerCountryFetchSize(page, perPage, countryCodes.length)
  const byCountry = new Map<string, SearchResponse[]>()
  let requestCount = 0
  const requestBudget = countryCodes.length * MAX_PAGES_PER_COUNTRY

  await Promise.all(
    countryCodes.map(async (country) => {
      const pages: SearchResponse[] = []
      let currentPage = 1
      let hasMore = true

      while (hasMore && currentPage <= MAX_PAGES_PER_COUNTRY) {
        const response = await searchCountry(query, country, currentPage, perCountry)
        requestCount += 1
        pages.push(response)
        hasMore = Boolean(response.hasMore)
        currentPage += 1
      }

      byCountry.set(country, pages)
    }),
  )

  const records = countryCodes.flatMap((country) =>
    (byCountry.get(country) ?? []).flatMap((response) => response.results.map((post) => toSearchRecord(post, country))),
  )
  const sortedRecords = records.sort(compareByDateDesc)
  const total = countryCodes.reduce((sum, country) => {
    const firstPage = byCountry.get(country)?.[0]
    return sum + (firstPage?.total ?? 0)
  }, 0)
  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / perPage)) : 0
  const start = (page - 1) * perPage
  const end = start + perPage

  return {
    results: sortedRecords.slice(start, end),
    total,
    totalPages,
    currentPage: page,
    hasMore: page < totalPages,
    suggestions: buildSuggestions(sortedRecords),
    performance: {
      source: "graphql",
      graphqlRequestCount: requestCount,
      graphqlRequestBudget: requestBudget,
      graphqlBudgetExhausted: requestCount >= requestBudget && countryCodes.some((country) => byCountry.get(country)?.at(-1)?.hasMore),
    },
  }
}

export async function searchGET(request: NextRequest) {
  logRequest(request)
  const startTime = Date.now()

  const rateLimitCheck = await checkRateLimit(request)
  if (rateLimitCheck.limited) {
    return respondWithSearch(
      request,
      { error: "Too many search requests", message: "Please try again later" },
      { status: 429, headers: { "Retry-After": rateLimitCheck.retryAfter?.toString() || "60" } },
    )
  }

  const { searchParams } = new URL(request.url)
  const baseParams = normalizeBaseSearchParams(searchParams)
  const page = normalizeIntegerParam(searchParams.get("page"), { fallback: 1, min: 1 })
  const perPage = normalizeIntegerParam(searchParams.get("per_page"), { fallback: 20, min: 1, max: 100 })

  if (!baseParams.query) {
    return respondWithSearch(request, { error: "Missing search query" }, { status: 400 })
  }

  try {
    if (baseParams.scope.type === "panAfrican") {
      const result = await searchPanAfrican(baseParams.query, page, perPage)
      return respondWithSearch(request, {
        ...result,
        query: baseParams.query,
        performance: { ...result.performance, responseTime: Date.now() - startTime },
      })
    }

    const result = await searchWordPressPosts(baseParams.query, {
      country: baseParams.scope.country,
      page,
      perPage,
    })
    const records = result.results.map((post) => toSearchRecord(post, baseParams.scope.type === "country" ? baseParams.scope.country : ""))

    return respondWithSearch(request, {
      results: records,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasMore: result.hasMore,
      query: baseParams.query,
      suggestions: result.suggestions ?? buildSuggestions(records),
      performance: {
        responseTime: Date.now() - startTime,
        source: "graphql",
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
        performance: { responseTime: Date.now() - startTime, source: "error" },
      },
      { status: 500 },
    )
  }
}

export { searchGET as GET }
