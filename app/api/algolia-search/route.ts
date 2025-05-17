import { NextResponse } from "next/server"
import algoliasearch from "algoliasearch/lite"

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { query, hitsPerPage = 10, page = 0 } = body

    // Validate the query
    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    // Get Algolia credentials from environment variables
    const appId = process.env.ALGOLIA_APP_ID
    const apiKey = process.env.ALGOLIA_SEARCH_API_KEY
    const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME

    // Validate credentials
    if (!appId || !apiKey || !indexName) {
      console.error("Missing Algolia credentials:", {
        hasAppId: !!appId,
        hasApiKey: !!apiKey,
        hasIndexName: !!indexName,
      })
      return NextResponse.json({ error: "Search service configuration error" }, { status: 500 })
    }

    // Initialize Algolia client
    const client = algoliasearch(appId, apiKey)
    const index = client.initIndex(indexName)

    // Perform the search
    const searchResults = await index.search(query, {
      hitsPerPage,
      page,
    })

    // Return the search results
    return NextResponse.json(searchResults)
  } catch (error) {
    console.error("Search API error:", error)

    // Return a proper JSON error response
    return NextResponse.json({ error: "An error occurred while searching" }, { status: 500 })
  }
}
