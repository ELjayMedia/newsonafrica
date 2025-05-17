type SearchParams = {
  query: string
  filters?: string
  page?: number
  hitsPerPage?: number
  indexName?: string
}

export async function searchAlgolia<T = any>(params: SearchParams) {
  try {
    // Validate required parameters
    if (!params.query?.trim()) {
      return {
        error: "Search query is required",
        hits: [],
        nbHits: 0,
      }
    }

    // Make sure we have an index name
    const indexName = params.indexName || process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME
    if (!indexName) {
      console.error("Missing Algolia index name")
      return {
        error: "Search configuration error: missing index name",
        hits: [],
        nbHits: 0,
      }
    }

    // Execute search request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch("/api/algolia-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          indexName,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Check if the response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Search API error: ${response.status} ${errorText}`)
        return {
          error: `Search failed with status ${response.status}: ${errorText.slice(0, 100)}`,
          statusCode: response.status,
          hits: [],
          nbHits: 0,
        }
      }

      // Safely parse the JSON
      const data = await response.json()
      return data
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError.name === "AbortError") {
        console.error("Search request timed out")
        return {
          error: "Search request timed out. Please try again.",
          hits: [],
          nbHits: 0,
        }
      }

      throw fetchError // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error("Search client error:", error)
    return {
      error: error instanceof Error ? error.message : "Unknown search error",
      hits: [],
      nbHits: 0,
    }
  }
}

// Provide app info for components that need it
export const getAlgoliaAppInfo = () => ({
  appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
  indexName: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "",

  // Check if we have the necessary config
  isConfigured: !!(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME),
})
