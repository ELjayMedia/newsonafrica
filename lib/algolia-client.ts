/**
 * Client-side utility for searching with Algolia
 */

type SearchParams = {
  query: string
  filters?: string
  page?: number
  hitsPerPage?: number
  indexName?: string
}

export async function searchAlgolia<T = any>(params: SearchParams) {
  try {
    // Make sure we have a valid query
    if (!params.query || params.query.trim() === "") {
      return { hits: [], nbHits: 0, page: params.page || 0, nbPages: 0 }
    }

    // Set up request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Make the request to our API endpoint
    const response = await fetch("/api/algolia-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        indexName: params.indexName || process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME,
      }),
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    // Check if the response is ok
    if (!response.ok) {
      // Try to get error details if available
      let errorDetails = ""
      try {
        const errorData = await response.json()
        errorDetails = errorData.error || ""
      } catch (e) {
        // If we can't parse the JSON, use the status text
        errorDetails = response.statusText
      }

      throw new Error(`Search API error: ${response.status} ${errorDetails}`)
    }

    // Check if the response is valid JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Search API error: Invalid response format")
    }

    // Parse the JSON response
    try {
      const data = await response.json()
      return data
    } catch (error) {
      console.error("JSON parsing error:", error)
      throw new Error("Search client error: Failed to parse search results")
    }
  } catch (error) {
    // Re-throw the error with a clear message
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Search request timed out")
      }
      throw error
    }
    throw new Error("An unexpected error occurred during search")
  }
}

/**
 * Provide Algolia app information for components that need it
 */
export const getAlgoliaAppInfo = () => ({
  appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
  indexName: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "",

  // Check if we have the necessary config
  isConfigured: !!(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME),
})
