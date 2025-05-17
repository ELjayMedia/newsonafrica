import { type NextRequest, NextResponse } from "next/server"
import algoliasearch from "algoliasearch"

// Input validation
const validateSearchParams = (params: any) => {
  const { query, indexName } = params

  if (!query || typeof query !== "string") {
    return { valid: false, error: "Query parameter is required and must be a string" }
  }

  if (!indexName || typeof indexName !== "string") {
    return { valid: false, error: "Index name is required and must be a string" }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let params
    try {
      params = await request.json()
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError)
      return NextResponse.json(
        { error: "Invalid request format", details: "Could not parse request body as JSON" },
        { status: 400 },
      )
    }

    // Validate search parameters
    const validation = validateSearchParams(params)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { query, indexName, filters, page = 1, hitsPerPage = 10 } = params

    // Initialize Algolia client
    const appId = process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
    const apiKey = process.env.ALGOLIA_SEARCH_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY

    // Debug logging for troubleshooting
    if (!appId) {
      console.error("Missing Algolia App ID")
      return NextResponse.json(
        { error: "Search service configuration error", details: "Missing Algolia App ID" },
        { status: 500 },
      )
    }

    if (!apiKey) {
      console.error("Missing Algolia API Key")
      return NextResponse.json(
        { error: "Search service configuration error", details: "Missing Algolia API Key" },
        { status: 500 },
      )
    }

    // Create Algolia client with error handling
    let client
    try {
      client = algoliasearch(appId, apiKey)
    } catch (clientError) {
      console.error("Failed to initialize Algolia client:", clientError)
      return NextResponse.json({ error: "Failed to initialize search client", hits: [], nbHits: 0 }, { status: 500 })
    }

    const index = client.initIndex(indexName)

    // Perform search with better error handling
    const searchOptions: any = {
      page: page - 1, // Algolia uses 0-based pagination
      hitsPerPage,
    }

    if (filters) {
      searchOptions.filters = filters
    }

    try {
      const results = await index.search(query, searchOptions)
      return NextResponse.json(results)
    } catch (searchError: any) {
      console.error("Algolia search operation failed:", searchError)

      // Provide more specific error information
      const errorDetails = searchError.message || "Unknown search error"
      const statusCode = searchError.status || 500

      return NextResponse.json(
        {
          error: `Search operation failed: ${errorDetails}`,
          algoliaError: true,
          hits: [],
          nbHits: 0,
        },
        { status: statusCode },
      )
    }
  } catch (error) {
    console.error("Unhandled exception in Algolia search API:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal search error",
        stack: process.env.NODE_ENV !== "production" ? (error instanceof Error ? error.stack : undefined) : undefined,
        hits: [],
        nbHits: 0,
      },
      { status: 500 },
    )
  }
}
