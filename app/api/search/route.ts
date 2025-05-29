import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { optimizedWordPressSearch, getWordPressSearchSuggestions } from "@/lib/wordpress-api"
import { FALLBACK_POSTS } from "@/lib/mock-data"

// Input validation schema
const searchParamsSchema = z.object({
  query: z.string().min(1, "Search query must be at least 1 character").max(100),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(["relevance", "date", "title"]).default("relevance"),
  categories: z.string().optional(),
  tags: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  suggestions: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
})

// Enhanced rate limiting with user-based tracking
type RateLimitEntry = {
  count: number
  resetAt: number
  userId?: string
}

// Update the rate limiting logic to be more forgiving
const RATE_LIMIT = 50 // Increased from 30 to 50 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const rateLimitMap = new Map<string, RateLimitEntry>()

// Performance monitoring
const performanceMetrics = {
  totalRequests: 0,
  averageResponseTime: 0,
  cacheHitRate: 0,
  errorRate: 0,
}

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"
  return `search:${ip}:${userAgent.slice(0, 50)}`
}

// Update the checkRateLimit function to be more lenient for authenticated users
function checkRateLimit(request: NextRequest): { limited: boolean; retryAfter?: number } {
  // Skip rate limiting for development environment
  if (process.env.NODE_ENV === "development") {
    return { limited: false }
  }

  const key = getRateLimitKey(request)
  const now = Date.now()

  // Check for auth token to potentially increase limits for authenticated users
  const hasAuthToken = request.headers.get("authorization") !== null
  const effectiveRateLimit = hasAuthToken ? RATE_LIMIT * 2 : RATE_LIMIT

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    })
    return { limited: false }
  }

  const entry = rateLimitMap.get(key)!

  if (now > entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + RATE_LIMIT_WINDOW
    return { limited: false }
  }

  if (entry.count >= effectiveRateLimit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { limited: true, retryAfter }
  }

  entry.count++
  return { limited: false }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  performanceMetrics.totalRequests++

  try {
    // Check rate limit
    const rateLimitCheck = checkRateLimit(request)
    if (rateLimitCheck.limited) {
      performanceMetrics.errorRate++
      return NextResponse.json(
        {
          error: "Too many search requests",
          message: "Please try again later",
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimitCheck.retryAfter?.toString() || "60",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      )
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")

    if (!query) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 })
    }

    const parsedParams = Object.fromEntries(searchParams.entries())
    const validationResult = searchParamsSchema.safeParse(parsedParams)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: validationResult.error.format(),
        },
        { status: 400 },
      )
    }

    const { page, perPage, sort, categories, tags, dateFrom, dateTo, suggestions } = validationResult.data

    // Handle search suggestions request
    if (suggestions) {
      try {
        const suggestionResults = await getWordPressSearchSuggestions(query, 8)
        const responseTime = Date.now() - startTime

        return NextResponse.json(
          {
            suggestions: suggestionResults,
            performance: {
              responseTime,
              source: "wordpress-suggestions",
            },
          },
          {
            headers: {
              "Cache-Control": "public, max-age=300",
              "X-Response-Time": responseTime.toString(),
            },
          },
        )
      } catch (error) {
        console.error("Suggestions error:", error)
        return NextResponse.json({ suggestions: [] })
      }
    }

    try {
      // Prepare search options
      const searchOptions = {
        page,
        perPage,
        categories: categories ? categories.split(",") : [],
        tags: tags ? tags.split(",") : [],
        dateFrom,
        dateTo,
        includeParallel: page === 1, // Only include parallel searches on first page
      }

      // Execute optimized WordPress search with enhanced options
      const searchResults = await optimizedWordPressSearch(query, {
        page,
        perPage,
        categories: categories ? categories.split(",") : [],
        tags: tags ? tags.split(",") : [],
        dateFrom,
        dateTo,
        includeParallel: page === 1, // Use parallel search only on first page
        sortBy: sort as "relevance" | "date" | "title",
      })

      const responseTime = Date.now() - startTime

      // Update performance metrics
      performanceMetrics.averageResponseTime = (performanceMetrics.averageResponseTime + responseTime) / 2

      const response = {
        ...searchResults,
        query,
        filters: { sort, categories, tags, dateFrom, dateTo },
        performance: {
          ...searchResults.performance,
          responseTime,
          totalRequests: performanceMetrics.totalRequests,
        },
      }

      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Response-Time": responseTime.toString(),
          "X-Search-Source": searchResults.searchSource || "wordpress",
        },
      })
    } catch (wpError) {
      console.error("WordPress search error:", wpError)
      performanceMetrics.errorRate++

      // Fallback to mock data with basic filtering
      const filteredResults = FALLBACK_POSTS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.excerpt.toLowerCase().includes(query.toLowerCase()),
      )

      // Apply pagination to fallback results
      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      const paginatedResults = filteredResults.slice(startIndex, endIndex)

      const responseTime = Date.now() - startTime

      const response = {
        items: paginatedResults,
        pagination: {
          page,
          perPage,
          totalItems: filteredResults.length,
          totalPages: Math.ceil(filteredResults.length / perPage),
          hasMore: page < Math.ceil(filteredResults.length / perPage),
        },
        query,
        filters: { sort, categories, tags, dateFrom, dateTo },
        searchSource: "fallback",
        performance: {
          responseTime,
          cached: false,
          error: true,
        },
      }

      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "public, max-age=60", // Shorter cache for fallback
          "X-Response-Time": responseTime.toString(),
          "X-Search-Source": "fallback",
        },
      })
    }
  } catch (error) {
    console.error("Search API error:", error)
    performanceMetrics.errorRate++

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
        items: [],
        pagination: {
          page: 1,
          perPage: 20,
          totalItems: 0,
          totalPages: 0,
          hasMore: false,
        },
        performance: {
          responseTime,
          error: true,
        },
      },
      {
        status: error instanceof Error && error.name === "AbortError" ? 408 : 500,
        headers: {
          "X-Response-Time": responseTime.toString(),
        },
      },
    )
  }
}

// Health check endpoint for search performance
export async function HEAD(request: NextRequest) {
  return NextResponse.json({
    status: "healthy",
    metrics: performanceMetrics,
    timestamp: Date.now(),
  })
}
