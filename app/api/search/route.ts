import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { applyRateLimit } from "@/lib/api-utils"

// Input validation schema
const searchParamsSchema = z.object({
  query: z.string().min(2, "Search query must be at least 2 characters").max(100),
  page: z.coerce.number().positive().default(1),
  hitsPerPage: z.coerce.number().positive().max(50).default(10),
  sort: z.enum(["relevance", "date", "title"]).optional().default("relevance"),
  categories: z.string().optional(),
  tags: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// Cache to store recent search results
const searchCache = new Map()

// Clean old cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, { timestamp }] of searchCache.entries()) {
    if (now - timestamp > 5 * 60 * 1000) {
      // 5 minutes expiration
      searchCache.delete(key)
    }
  }
}, 60 * 1000) // Check every minute

export async function GET(request: NextRequest) {
  try {
    // Apply a more lenient rate limit - 30 requests per minute
    // This is a global limit, not per-user
    const rateLimitResponse = await applyRateLimit(request, 30, "SEARCH_API")
    if (rateLimitResponse) {
      // Return a more helpful error message for rate limiting
      return NextResponse.json(
        {
          error: "Search rate limit exceeded",
          message: "Please wait a moment before trying again",
          retryAfter: 60, // Suggest retry after 60 seconds
          hits: [],
          nbHits: 0,
          page: 0,
          nbPages: 0,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        },
      )
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

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

    const { query, page, hitsPerPage, sort = "relevance", categories, tags, dateFrom, dateTo } = validationResult.data

    // Create a cache key from the search parameters
    const cacheKey = JSON.stringify({ query, page, hitsPerPage, sort, categories, tags, dateFrom, dateTo })

    // Check if we have a cached result
    if (searchCache.has(cacheKey)) {
      const { data, timestamp } = searchCache.get(cacheKey)
      // Only use cache if it's less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return NextResponse.json(data)
      }
    }

    // Use WordPress REST API for search
    const wpApiUrl = process.env.WORDPRESS_API_URL || ""
    if (!wpApiUrl) {
      throw new Error("WordPress API URL is not configured")
    }

    // Build the WordPress search URL with all parameters
    let searchUrl = `${wpApiUrl}/wp/v2/posts?search=${encodeURIComponent(query)}&page=${page}&per_page=${hitsPerPage}&_embed=true`

    // Add sorting
    if (sort === "date") {
      searchUrl += "&orderby=date&order=desc"
    } else if (sort === "title") {
      searchUrl += "&orderby=title&order=asc"
    } // relevance is default in WordPress

    // Add category filter if provided
    if (categories) {
      searchUrl += `&categories=${categories}`
    }

    // Add tag filter if provided
    if (tags) {
      searchUrl += `&tags=${tags}`
    }

    // Add date range filters if provided
    if (dateFrom) {
      searchUrl += `&after=${dateFrom}T00:00:00Z`
    }
    if (dateTo) {
      searchUrl += `&before=${dateTo}T23:59:59Z`
    }

    // Fetch search results from WordPress with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(searchUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // If WordPress API is rate limiting, provide a helpful message
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: "WordPress API rate limit exceeded",
            message: "Our search service is experiencing high demand. Please try again shortly.",
            hits: [],
            nbHits: 0,
            page: 0,
            nbPages: 0,
          },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
            },
          },
        )
      }
      throw new Error(`WordPress API returned ${response.status}: ${response.statusText}`)
    }

    // Get the total number of results from headers
    const totalPosts = Number.parseInt(response.headers.get("X-WP-Total") || "0", 10)
    const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") || "0", 10)

    // Parse the response
    const posts = await response.json()

    // Transform WordPress posts to match the expected format
    const hits = posts.map((post: any) => ({
      objectID: post.id.toString(),
      title: post.title.rendered,
      excerpt: post.excerpt.rendered,
      slug: post.slug,
      date: post.date,
      modified: post.modified,
      featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
        ? {
            node: {
              sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
            },
          }
        : undefined,
      categories:
        post._embedded?.["wp:term"]?.[0]?.map((term: any) => ({
          node: {
            name: term.name,
            slug: term.slug,
          },
        })) || [],
      author: post._embedded?.["author"]?.[0]
        ? {
            node: {
              name: post._embedded["author"][0].name,
            },
          }
        : { node: { name: "Unknown" } },
    }))

    // Prepare the response data
    const responseData = {
      hits,
      nbHits: totalPosts,
      page: page - 1, // Adjust to 0-based for client compatibility
      nbPages: totalPages,
      query,
      params: {
        sort,
        categories,
        tags,
        dateFrom,
        dateTo,
      },
    }

    // Cache the result
    searchCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    })

    // Return the search results with metadata
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Search API error:", error)

    // Return a user-friendly error message
    return NextResponse.json(
      {
        error: "Failed to perform search",
        details: error instanceof Error ? error.message : String(error),
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
      },
      { status: error instanceof Error && error.message.includes("aborted") ? 408 : 500 },
    )
  }
}
