import { NextResponse } from "next/server"
import algoliasearch from "algoliasearch"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { query, filters, page = 0, hitsPerPage = 10, indexName } = body

    // Rate limiting (optional but recommended)
    const supabase = createClient(cookies())
    const clientIp = request.headers.get("x-forwarded-for") || "unknown"

    // Optional: Track search queries for analytics
    try {
      await supabase.from("search_queries").insert({
        query,
        client_ip: clientIp,
        user_agent: request.headers.get("user-agent") || "unknown",
        filters: JSON.stringify(filters || {}),
      })
    } catch (error) {
      // Don't fail the search if analytics fails
      console.error("Failed to log search query:", error)
    }

    // Initialize Algolia client - use server-side API key only
    const client = algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
      process.env.ALGOLIA_ADMIN_API_KEY || "", // Use server-side key only, NOT the search API key
    )

    const index = client.initIndex(indexName || process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "")

    // Perform the search
    const searchParams: any = {
      page,
      hitsPerPage,
    }

    if (filters) {
      searchParams.filters = filters
    }

    const results = await index.search(query, searchParams)

    return NextResponse.json(results)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
