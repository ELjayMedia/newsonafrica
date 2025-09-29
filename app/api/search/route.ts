import type { NextRequest } from "next/server"
import { circuitBreaker } from "@/lib/api/circuit-breaker"
import { getArticleUrl } from "@/lib/utils/routing"
import {
  searchWordPressPosts as wpSearchPosts,
  getSearchSuggestions as wpGetSearchSuggestions,
} from "@/lib/wordpress-search"
import { jsonWithCors, logRequest } from "@/lib/api-utils"

export const runtime = "nodejs"

// Cache policy: medium (5 minutes)
export const revalidate = 300

// Rate limiting
const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW = 60 * 1000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  return `search:${ip}`
}

function checkRateLimit(request: NextRequest): { limited: boolean; retryAfter?: number } {
  if (process.env.NODE_ENV === "development") {
    return { limited: false }
  }

  const key = getRateLimitKey(request)
  const now = Date.now()

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { limited: false }
  }

  const entry = rateLimitMap.get(key)!

  if (now > entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + RATE_LIMIT_WINDOW
    return { limited: false }
  }

  if (entry.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { limited: true, retryAfter }
  }

  entry.count++
  return { limited: false }
}

// Search WordPress posts
async function searchWordPressPosts(query: string, page = 1, perPage = 20) {
  return await circuitBreaker.execute(
    "wordpress-search-api",
    async () => {
      const response = await wpSearchPosts(query, { page, perPage })
      return {
        results: response.results,
        total: response.total,
        totalPages: response.totalPages,
        currentPage: response.currentPage,
        hasMore: response.hasMore,
      }
    },
    async () => {
      console.log("[v0] Search API: Using enhanced fallback due to WordPress unavailability")
      const filteredResults = FALLBACK_POSTS.filter(
        (item) =>
          item.title.rendered.toLowerCase().includes(query.toLowerCase()) ||
          item.excerpt.rendered.toLowerCase().includes(query.toLowerCase()),
      )

      return {
        results: filteredResults.slice((page - 1) * perPage, page * perPage),
        total: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / perPage),
        currentPage: page,
        hasMore: page < Math.ceil(filteredResults.length / perPage),
      }
    },
  )
}

// Get search suggestions from WordPress
async function getSearchSuggestions(query: string): Promise<string[]> {
  return await wpGetSearchSuggestions(query)
}

// Fallback search data
const FALLBACK_POSTS = [
  {
    id: 1,
    title: { rendered: "Welcome to News On Africa" },
    excerpt: { rendered: "Your premier source for African news, politics, business, and culture." },
    slug: "welcome-to-news-on-africa",
    date: new Date().toISOString(),
    link: getArticleUrl("welcome-to-news-on-africa"),
    featured_media: 0,
    categories: [],
    tags: [],
    author: 1,
    _embedded: {
      author: [{ name: "News On Africa Team" }],
    },
  },
  {
    id: 2,
    title: { rendered: "Search Service Information" },
    excerpt: { rendered: "Our search is powered by WordPress and provides comprehensive coverage of African news." },
    slug: "search-service-info",
    date: new Date().toISOString(),
    link: getArticleUrl("search-service-info"),
    featured_media: 0,
    categories: [],
    tags: [],
    author: 1,
    _embedded: {
      author: [{ name: "News On Africa Team" }],
    },
  },
]

export async function GET(request: NextRequest) {
  logRequest(request)
  const startTime = Date.now()

  try {
    // Check rate limit
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

    // Parse search parameters
    const { searchParams } = new URL(request.url)
    const queryParam = searchParams.get("q") || searchParams.get("query")

    if (!queryParam) {
      return jsonWithCors(request, { error: "Missing search query" }, { status: 400 })
    }

    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const perPage = Number.parseInt(searchParams.get("per_page") || "20", 10)
    const suggestions = searchParams.get("suggestions") === "true"

    // Handle suggestions request
    if (suggestions) {
      try {
        const suggestionResults = await getSearchSuggestions(queryParam)
        return jsonWithCors(request, {
          suggestions: suggestionResults,
          performance: {
            responseTime: Date.now() - startTime,
            source: "wordpress-suggestions",
          },
        })
      } catch (error) {
        return jsonWithCors(request, { suggestions: [] })
      }
    }

    // Perform search
    try {
      const searchResults = await searchWordPressPosts(queryParam, page, perPage)
      const responseTime = Date.now() - startTime

      return jsonWithCors(request, {
        ...searchResults,
        query: queryParam,
        performance: {
          responseTime,
          source: "wordpress",
        },
      })
    } catch (wpError) {
      // Fallback to mock data
      const filteredResults = FALLBACK_POSTS.filter(
        (item) =>
          item.title.rendered.toLowerCase().includes(queryParam.toLowerCase()) ||
          item.excerpt.rendered.toLowerCase().includes(queryParam.toLowerCase()),
      )

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      const paginatedResults = filteredResults.slice(startIndex, endIndex)

      return jsonWithCors(request, {
        results: paginatedResults,
        total: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / perPage),
        currentPage: page,
        hasMore: page < Math.ceil(filteredResults.length / perPage),
        query: queryParam,
        performance: {
          responseTime: Date.now() - startTime,
          error: true,
        },
      })
    }
  } catch (error) {
    return jsonWithCors(
      request,
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
        results: [],
        total: 0,
        totalPages: 0,
        currentPage: 1,
        hasMore: false,
        query: "",
        performance: {
          responseTime: Date.now() - startTime,
          error: true,
        },
      },
      { status: 500 },
    )
  }
}
