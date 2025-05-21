import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { client } from "@/lib/wordpress-api"
import { FALLBACK_POSTS } from "@/lib/mock-data"

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
  fuzzy: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
  fuzzyThreshold: z.coerce.number().min(0).max(1).default(0.3).optional(),
})

// Simple in-memory cache with TTL and popularity tracking
type CacheEntry = {
  data: any
  timestamp: number
  hits: number
}

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const MAX_CACHE_SIZE = 500 // Limit cache size
const searchCache = new Map<string, CacheEntry>()

// Clean cache periodically
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now()
      let entriesRemoved = 0

      // First pass: remove expired entries
      for (const [key, entry] of searchCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
          searchCache.delete(key)
          entriesRemoved++
        }
      }

      // Second pass: if still too large, remove least popular entries
      if (searchCache.size > MAX_CACHE_SIZE - entriesRemoved) {
        const entries = Array.from(searchCache.entries()).sort((a, b) => a[1].hits - b[1].hits)

        const toRemove = searchCache.size - (MAX_CACHE_SIZE - entriesRemoved)
        entries.slice(0, toRemove).forEach(([key]) => {
          searchCache.delete(key)
        })
      }
    },
    5 * 60 * 1000,
  ) // Check every 5 minutes
}

// Rate limiting
type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMIT = 20 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean rate limit entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key)
      }
    }
  }, 60 * 1000) // Check every minute
}

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

// WordPress GraphQL search query
const SEARCH_QUERY = `
  query SearchPosts($query: String!, $first: Int!, $after: String) {
    posts(where: {search: $query}, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        excerpt
        slug
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            name
            slug
          }
        }
        categories {
          nodes {
            id
            name
            slug
          }
        }
        tags {
          nodes {
            id
            name
            slug
          }
        }
      }
    }
  }
`

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

    const { page, perPage, sort, categories, tags, dateFrom, dateTo, fuzzy, fuzzyThreshold } = validationResult.data

    // Create cache key
    const cacheKey = JSON.stringify({
      query,
      page,
      perPage,
      sort,
      categories,
      tags,
      dateFrom,
      dateTo,
      fuzzy,
      fuzzyThreshold,
    })

    // Check cache
    if (searchCache.has(cacheKey)) {
      const entry = searchCache.get(cacheKey)!
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        // Increment hit counter
        entry.hits++
        return NextResponse.json(entry.data, {
          headers: {
            "Content-Encoding": "gzip",
            "Cache-Control": "public, max-age=300", // Allow browser caching for 5 minutes
          },
        })
      }
    }

    try {
      // Calculate pagination for GraphQL
      const first = perPage
      const after = page > 1 ? btoa(`arrayconnection:${(page - 1) * perPage - 1}`) : null

      // Execute WordPress GraphQL search query
      const data = await client.request(SEARCH_QUERY, {
        query,
        first,
        after,
      })

      // Transform WordPress response to our standard format
      const items = data.posts.nodes.map((post: any) => ({
        id: post.id,
        title: post.title || "",
        excerpt: post.excerpt || "",
        slug: post.slug || "",
        date: post.date || "",
        featuredImage: post.featuredImage?.node || null,
        categories: post.categories?.nodes || [],
        author: {
          name: post.author?.node?.name || "Unknown",
          slug: post.author?.node?.slug || "",
        },
      }))

      // Apply additional filters if needed
      let filteredItems = items

      // Apply category filter if specified
      if (categories) {
        const categoryIds = categories.split(",").map((id) => Number.parseInt(id.trim()))
        filteredItems = filteredItems.filter((item) => item.categories.some((cat: any) => categoryIds.includes(cat.id)))
      }

      // Apply date filters if specified
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        filteredItems = filteredItems.filter((item) => new Date(item.date) >= fromDate)
      }

      if (dateTo) {
        const toDate = new Date(dateTo)
        filteredItems = filteredItems.filter((item) => new Date(item.date) <= toDate)
      }

      // Apply sorting if needed
      if (sort === "date") {
        filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      } else if (sort === "title") {
        filteredItems.sort((a, b) => a.title.localeCompare(b.title))
      }

      const response = {
        items: filteredItems,
        pagination: {
          page,
          perPage,
          totalItems: filteredItems.length * (data.posts.pageInfo.hasNextPage ? 2 : 1), // Estimate total
          totalPages: data.posts.pageInfo.hasNextPage ? page + 1 : page,
          hasMore: data.posts.pageInfo.hasNextPage,
        },
        query,
        filters: { sort, categories, tags, dateFrom, dateTo, fuzzy, fuzzyThreshold },
        searchSource: "wordpress",
      }

      // Cache result
      searchCache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
        hits: 1,
      })

      return NextResponse.json(response, {
        headers: {
          "Content-Encoding": "gzip",
          "Cache-Control": "public, max-age=300",
        },
      })
    } catch (wpError) {
      console.error("WordPress search error:", wpError)

      // Use fallback data
      const filteredResults = FALLBACK_POSTS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.excerpt.toLowerCase().includes(query.toLowerCase()),
      )

      const response = {
        items: filteredResults,
        pagination: {
          page,
          perPage,
          totalItems: filteredResults.length,
          totalPages: Math.ceil(filteredResults.length / perPage),
          hasMore: page < Math.ceil(filteredResults.length / perPage),
        },
        query,
        filters: { sort, categories, tags, dateFrom, dateTo, fuzzy, fuzzyThreshold },
        searchSource: "fallback",
      }

      // Cache result
      searchCache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
        hits: 1,
      })

      return NextResponse.json(response, {
        headers: {
          "Content-Encoding": "gzip",
          "Cache-Control": "public, max-age=300",
        },
      })
    }
  } catch (error) {
    console.error("Search API error:", error)

    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
        items: [],
        pagination: {
          page: 1,
          perPage: 10,
          totalItems: 0,
          totalPages: 0,
          hasMore: false,
        },
      },
      {
        status: error instanceof Error && error.name === "AbortError" ? 408 : 500,
      },
    )
  }
}
