import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Input validation schema
const searchParamsSchema = z.object({
  q: z.string().min(1, "Search query must be at least 1 character").max(100),
  query: z.string().min(1, "Search query must be at least 1 character").max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  suggestions: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
})

// WordPress API configuration
const WORDPRESS_API_URL =
  process.env.WORDPRESS_REST_API_URL ||
  process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
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
  try {
    const searchParams = new URLSearchParams({
      search: query,
      page: page.toString(),
      per_page: perPage.toString(),
      _embed: "1",
      orderby: "relevance",
      order: "desc",
    })

    const response = await fetch(`${WORDPRESS_API_URL}/posts?${searchParams}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`)
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
    console.error("WordPress search error:", error)
    throw error
  }
}

// Get search suggestions
async function getSearchSuggestions(query: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?search=${encodeURIComponent(query)}&per_page=10&_fields=title`,
    )

    if (!response.ok) return []

    const posts = await response.json()
    const suggestions = new Set<string>()

    posts.forEach((post: any) => {
      const words = post.title.rendered
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && word.includes(query.toLowerCase()))

      words.forEach((word: string) => {
        if (suggestions.size < 8) {
          suggestions.add(word)
        }
      })
    })

    return Array.from(suggestions)
  } catch (error) {
    console.error("Error getting suggestions:", error)
    return []
  }
}

// Fallback search data
const FALLBACK_POSTS = [
  {
    id: 1,
    title: { rendered: "Sample News Article" },
    excerpt: { rendered: "This is a sample news article for fallback search results." },
    slug: "sample-news-article",
    date: new Date().toISOString(),
    link: "/post/sample-news-article",
    featured_media: 0,
    categories: [],
    tags: [],
    author: 1,
  },
]

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log("Search API called:", request.url)

  try {
    // Check rate limit
    const rateLimitCheck = checkRateLimit(request)
    if (rateLimitCheck.limited) {
      console.log("Rate limit exceeded")
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
    console.log("Search query:", queryParam)

    if (!queryParam) {
      console.log("Missing search query")
      return NextResponse.json({ error: "Missing search query" }, { status: 400 })
    }

    // Validate parameters
    const params = Object.fromEntries(searchParams.entries())
    params.q = queryParam // Ensure we have the query parameter

    const validationResult = searchParamsSchema.safeParse(params)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: validationResult.error.format(),
        },
        { status: 400 },
      )
    }

    const { q: query, page, per_page: perPage, suggestions } = validationResult.data

    // Handle suggestions request
    if (suggestions) {
      try {
        const suggestionResults = await getSearchSuggestions(query)
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
      const searchResults = await searchWordPressPosts(query, page, perPage)
      const responseTime = Date.now() - startTime

      return NextResponse.json({
        ...searchResults,
        query,
        performance: {
          responseTime,
          source: "wordpress",
        },
      })
    } catch (wpError) {
      console.error("WordPress search failed, using fallback:", wpError)

      // Fallback to mock data
      const filteredResults = FALLBACK_POSTS.filter(
        (item) =>
          item.title.rendered.toLowerCase().includes(query.toLowerCase()) ||
          item.excerpt.rendered.toLowerCase().includes(query.toLowerCase()),
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
        query,
        performance: {
          responseTime: Date.now() - startTime,
          source: "fallback",
          error: true,
        },
      })
    }
  } catch (error) {
    console.error("Search API error:", error)

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
