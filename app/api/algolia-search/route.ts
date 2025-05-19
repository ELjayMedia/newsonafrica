import { type NextRequest, NextResponse } from "next/server"
import algoliasearch from "algoliasearch/lite"

// Rate limiting
const RATE_LIMIT = 20 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    const now = Date.now()
    const rateLimitKey = `algolia:${ip}`

    if (!rateLimitMap.has(rateLimitKey)) {
      rateLimitMap.set(rateLimitKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    } else {
      const entry = rateLimitMap.get(rateLimitKey)!

      if (now > entry.resetAt) {
        entry.count = 1
        entry.resetAt = now + RATE_LIMIT_WINDOW
      } else if (entry.count >= RATE_LIMIT) {
        return NextResponse.json({ error: "Too many search requests. Please try again later." }, { status: 429 })
      } else {
        entry.count++
      }
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { query, indexName, filters, page = 0, hitsPerPage = 10 } = body

    // Validate required parameters
    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 })
    }

    // Check if Algolia is configured - ONLY use server-side environment variables
    const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID // This is ok to be public
    const apiKey = process.env.ALGOLIA_SEARCH_API_KEY // Only use the server-side key
    const index = indexName || process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME // Index name is ok to be public

    if (!appId || !apiKey || !index) {
      console.error("Algolia search is not properly configured")
      return NextResponse.json({ error: "Search service is not configured properly" }, { status: 503 })
    }

    // Initialize Algolia client
    const client = algoliasearch(appId, apiKey)
    const algoliaIndex = client.initIndex(index)

    // Perform search with timeout
    const searchPromise = algoliaIndex.search(query, {
      filters,
      page,
      hitsPerPage,
    })

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Search request timed out")), 5000)
    })

    // Race the search against the timeout
    const result = await Promise.race([searchPromise, timeoutPromise])

    return NextResponse.json(result)
  } catch (error) {
    console.error("Algolia search API error:", error)

    // Provide appropriate error response
    const errorMessage = error instanceof Error ? error.message : "Unknown search error"
    const status = errorMessage.includes("timed out") ? 408 : 500

    return NextResponse.json({ error: `Search failed: ${errorMessage}` }, { status })
  }
}
