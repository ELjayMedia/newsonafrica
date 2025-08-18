import logger from "@/utils/logger"
import env from "@/lib/config/env"
import { type NextRequest, NextResponse } from "next/server"

// WordPress API configuration
const WORDPRESS_API_URL =
  env.WORDPRESS_REST_API_URL ||
  env.NEXT_PUBLIC_WORDPRESS_API_URL ||
  "https://newsonafrica.com/sz/wp-json/wp/v2"

// Rate limiting
const RATE_LIMIT = 50
const RATE_LIMIT_WINDOW = 60 * 1000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  return `search:${ip}`
}

function checkRateLimit(request: NextRequest): { limited: boolean; retryAfter?: number } {
  if (env.NODE_ENV === "development") {
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
  try {
    const searchParams = new URLSearchParams({
      search: query,
      page: page.toString(),
      per_page: perPage.toString(),
      _embed: "1",
      orderby: "relevance",
      order: "desc",
      status: "publish",
    })

    const url = `${WORDPRESS_API_URL}/posts?${searchParams}`

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "NewsOnAfrica/1.0",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
    }

    const posts = await response.json()
    const totalPosts = Number.parseInt(response.headers.get("X-WP-Total") || "0", 10)
    const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") || "1", 10)

    return {
      results: posts,
      total: totalPosts,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages,
    }
  } catch (error) {
    logger.error("WordPress search error:", error)
    throw error
  }
}

// Get search suggestions from WordPress
async function getSearchSuggestions(query: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?search=${encodeURIComponent(query)}&per_page=10&_fields=title`,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "NewsOnAfrica/1.0",
        },
      },
    )

    if (!response.ok) {
      return []
    }

    const posts = await response.json()
    const suggestions = new Set<string>()

    posts.forEach((post: any) => {
      // Extract words from titles
      const titleWords = post.title.rendered
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && word.includes(query.toLowerCase()))

      titleWords.forEach((word: string) => {
        if (suggestions.size < 8) {
          suggestions.add(word)
        }
      })
    })

    return Array.from(suggestions)
  } catch (error) {
    logger.error("Error getting suggestions:", error)
    return []
  }
}

// Fallback search data
const FALLBACK_POSTS = [
  {
    id: 1,
    title: { rendered: "Welcome to News On Africa" },
    excerpt: { rendered: "Your premier source for African news, politics, business, and culture." },
    slug: "welcome-to-news-on-africa",
    date: new Date().toISOString(),
    link: "/post/welcome-to-news-on-africa",
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
    link: "/post/search-service-info",
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
  const startTime = Date.now()

  try {
    // Check rate limit
    const rateLimitCheck = checkRateLimit(request)
    if (rateLimitCheck.limited) {
      return NextResponse.json(
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
      return NextResponse.json({ error: "Missing search query" }, { status: 400 })
    }

    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const perPage = Number.parseInt(searchParams.get("per_page") || "20", 10)
    const suggestions = searchParams.get("suggestions") === "true"

    // Handle suggestions request
    if (suggestions) {
      try {
        const suggestionResults = await getSearchSuggestions(queryParam)
        return NextResponse.json({
          suggestions: suggestionResults,
          performance: {
            responseTime: Date.now() - startTime,
            source: "wordpress-suggestions",
          },
        })
      } catch (error) {
        return NextResponse.json({ suggestions: [] })
      }
    }

    // Perform search
    try {
      const searchResults = await searchWordPressPosts(queryParam, page, perPage)
      const responseTime = Date.now() - startTime

      return NextResponse.json({
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

      return NextResponse.json({
        results: paginatedResults,
        total: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / perPage),
        currentPage: page,
        hasMore: page < Math.ceil(filteredResults.length / perPage),
        query: queryParam,
        performance: {
          responseTime: Date.now() - startTime,
          source: "fallback",
          error: true,
        },
      })
    }
  } catch (error) {
    return NextResponse.json(
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
