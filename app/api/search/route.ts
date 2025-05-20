import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import algoliasearch from "algoliasearch"
import type { SearchResult } from "@/lib/search"

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
  hits: number // Track popularity for potential cache eviction strategies
}

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes (up from 15)
const MAX_CACHE_SIZE = 500 // Limit cache size to prevent memory issues
const searchCache = new Map<string, CacheEntry>()

// Clean cache more efficiently
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

// Initialize Algolia client
const algoliaClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
  process.env.ALGOLIA_SEARCH_API_KEY || "",
)
const algoliaIndex = algoliaClient.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "")

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

    // Configure search options
    const searchOptions = {
      page: page - 1, // Algolia uses 0-based indexing
      hitsPerPage: perPage,
    }

    // Add fuzzy search options if enabled
    if (fuzzy) {
      Object.assign(searchOptions, {
        // Algolia's typo tolerance settings
        typoTolerance: true,
        minWordSizefor1Typo: 3,
        minWordSizefor2Typos: 7,
      })
    } else {
      Object.assign(searchOptions, {
        typoTolerance: false,
      })
    }

    // Perform search
    const { hits, nbPages } = await algoliaIndex.search(query, searchOptions)

    // Transform Algolia hits to our SearchResult format
    const results: SearchResult[] = hits.map((hit: any) => ({
      id: hit.objectID,
      title: hit.title || "",
      excerpt: hit.excerpt || "",
      slug: hit.slug || "",
      date: hit.date || "",
      featuredImage: hit.featuredImage || null,
      categories: hit.categories || { nodes: [] },
    }))

    const response = {
      results,
      totalPages: nbPages,
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
        "Cache-Control": "public, max-age=300", // Allow browser caching for 5 minutes
      },
    })
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
