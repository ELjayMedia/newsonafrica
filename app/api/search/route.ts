import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { client } from "@/lib/wordpress-api"
import { queries } from "@/lib/wordpress-queries"

// Input validation schema
const searchParamsSchema = z.object({
  query: z.string().min(2, "Search query must be at least 2 characters").max(100),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(["relevance", "date", "title"]).default("relevance"),
  categories: z.string().optional(),
  tags: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// Simple in-memory cache with TTL
type CacheEntry = {
  data: any
  timestamp: number
}

const CACHE_TTL = 15 * 60 * 1000 // 15 minutes
const searchCache = new Map<string, CacheEntry>()

// Clean cache periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key)
    }
  }
}, 60 * 1000) // Check every minute

// Rate limiting
type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMIT = 20 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000) // Check every minute

function getRateLimitKey(request: NextRequest): string {
  // Use IP address as rate limit key
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  return `search:${ip}`
}

function checkRateLimit(request: NextRequest): { limited: boolean; retryAfter?: number } {
  const key = getRateLimitKey(request)
  const now = Date.now()

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    })
    return { limited: false }
  }

  const entry = rateLimitMap.get(key)!

  // Reset if window has passed
  if (now > entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + RATE_LIMIT_WINDOW
    return { limited: false }
  }

  // Check if over limit
  if (entry.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { limited: true, retryAfter }
  }

  // Increment count
  entry.count++
  return { limited: false }
}

/**
 * Search using GraphQL API
 */
async function searchWithGraphQL(
  query: string,
  page: number,
  perPage: number,
  sort: string,
  categories?: string,
  tags?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  try {
    // Create variables for GraphQL query
    const variables = {
      query,
      first: perPage,
      after: page > 1 ? btoa(`arrayconnection:${(page - 1) * perPage - 1}`) : null,
      orderBy: {
        field: sort === "date" ? "DATE" : sort === "title" ? "TITLE" : "RELEVANCE",
        order: sort === "title" ? "ASC" : "DESC",
      },
    }

    // Add category and tag filters if provided
    if (categories || tags || dateFrom || dateTo) {
      // @ts-ignore - we're adding this dynamically
      variables.where = {}

      if (categories) {
        // @ts-ignore
        variables.where.categoryIn = categories.split(",")
      }

      if (tags) {
        // @ts-ignore
        variables.where.tagIn = tags.split(",")
      }

      if (dateFrom) {
        // @ts-ignore
        variables.where.dateQuery = variables.where.dateQuery || {}
        // @ts-ignore
        variables.where.dateQuery.after = dateFrom
      }

      if (dateTo) {
        // @ts-ignore
        variables.where.dateQuery = variables.where.dateQuery || {}
        // @ts-ignore
        variables.where.dateQuery.before = dateTo
      }
    }

    // Execute GraphQL query
    const data = await client.request(queries.searchPosts, variables)

    // Transform response to match our API format
    const posts = data.posts.nodes
    const pageInfo = data.posts.pageInfo

    return {
      items: posts.map((post: any) => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        slug: post.slug,
        date: post.date,
        featuredImage: post.featuredImage
          ? {
              sourceUrl: post.featuredImage.node.sourceUrl,
            }
          : null,
        categories: post.categories.nodes.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })),
        author: {
          name: post.author?.node?.name || "Unknown",
          slug: post.author?.node?.slug || "",
        },
      })),
      pagination: {
        page,
        perPage,
        totalItems: data.posts.pageInfo.total || 0,
        totalPages: Math.ceil((data.posts.pageInfo.total || 0) / perPage),
        hasMore: pageInfo.hasNextPage,
      },
      searchSource: "graphql",
    }
  } catch (error) {
    console.error("GraphQL search error:", error)
    throw error
  }
}

/**
 * Search using REST API (fallback)
 */
async function searchWithREST(
  query: string,
  page: number,
  perPage: number,
  sort: string,
  categories?: string,
  tags?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  // Get WordPress API URL from environment
  const wpApiUrl =
    process.env.WORDPRESS_REST_API_URL ||
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
    "https://newsonafrica.com/sz/wp-json/wp/v2"

  // Build search URL
  let searchUrl = `${wpApiUrl}/posts?search=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&_embed=true`

  // Add sorting
  if (sort === "date") {
    searchUrl += "&orderby=date&order=desc"
  } else if (sort === "title") {
    searchUrl += "&orderby=title&order=asc"
  }

  // Add filters
  if (categories) {
    searchUrl += `&categories=${categories}`
  }

  if (tags) {
    searchUrl += `&tags=${tags}`
  }

  if (dateFrom) {
    searchUrl += `&after=${dateFrom}T00:00:00Z`
  }

  if (dateTo) {
    searchUrl += `&before=${dateTo}T23:59:59Z`
  }

  // Fetch with timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

  const response = await fetch(searchUrl, {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "NewsOnAfrica/1.0",
    },
    signal: controller.signal,
    next: { revalidate: 300 }, // Cache for 5 minutes
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`WordPress API returned ${response.status}: ${response.statusText}`)
  }

  // Get pagination info from headers
  const totalItems = Number.parseInt(response.headers.get("X-WP-Total") || "0", 10)
  const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") || "0", 10)

  // Parse response
  const posts = await response.json()

  // Transform posts to a consistent format
  return {
    items: posts.map((post: any) => ({
      id: post.id.toString(),
      title: post.title.rendered,
      excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, "").slice(0, 150) + "...",
      slug: post.slug,
      date: post.date,
      featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
        ? {
            sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
          }
        : null,
      categories:
        post._embedded?.["wp:term"]?.[0]?.map((term: any) => ({
          id: term.id,
          name: term.name,
          slug: term.slug,
        })) || [],
      author: post._embedded?.["author"]?.[0]
        ? {
            name: post._embedded["author"][0].name,
            slug: post._embedded["author"][0].slug,
          }
        : { name: "Unknown", slug: "" },
    })),
    pagination: {
      page,
      perPage,
      totalItems,
      totalPages,
      hasMore: page < totalPages,
    },
    searchSource: "rest",
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitCheck = checkRateLimit(request)
    if (rateLimitCheck.limited) {
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

    const { page, perPage, sort, categories, tags, dateFrom, dateTo } = validationResult.data

    // Create cache key
    const cacheKey = JSON.stringify({ query, page, perPage, sort, categories, tags, dateFrom, dateTo })

    // Check cache
    if (searchCache.has(cacheKey)) {
      const { data, timestamp } = searchCache.get(cacheKey)!
      if (Date.now() - timestamp < CACHE_TTL) {
        return NextResponse.json(data)
      }
    }

    // Try GraphQL first, fall back to REST API
    let result
    try {
      result = await searchWithGraphQL(query, page, perPage, sort, categories, tags, dateFrom, dateTo)
    } catch (graphqlError) {
      console.log("GraphQL search failed, falling back to REST API:", graphqlError)
      try {
        result = await searchWithREST(query, page, perPage, sort, categories, tags, dateFrom, dateTo)
      } catch (restError) {
        throw new Error(`Both GraphQL and REST API search failed: ${restError}`)
      }
    }

    // Prepare response
    const response = {
      items: result.items,
      pagination: result.pagination,
      query,
      filters: {
        sort,
        categories,
        tags,
        dateFrom,
        dateTo,
      },
      searchSource: result.searchSource,
    }

    // Cache result
    searchCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("Search API error:", error)

    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: error instanceof Error && error.name === "AbortError" ? 408 : 500,
      },
    )
  }
}
