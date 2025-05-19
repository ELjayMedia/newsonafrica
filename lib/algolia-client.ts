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
      // Get the response text first to avoid JSON parsing errors
      const responseText = await response.text()

      // Try to parse as JSON if possible
      let errorData = { error: responseText }
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        // Not JSON, use the text as is
      }

      return {
        error: `Search API error: ${response.status} ${errorData.error || responseText.substring(0, 100)}`,
        statusCode: response.status,
        hits: [],
        nbHits: 0,
      }
    }

    // Check if the response is valid JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      // Get the response text to provide better error context
      const responseText = await response.text()
      return {
        error: `Search API error: Invalid response format (${contentType}). Response starts with: ${responseText.substring(0, 100)}`,
        hits: [],
        nbHits: 0,
      }
    }

    // Parse the JSON response safely
    try {
      const responseText = await response.text()

      // Check if the response is empty
      if (!responseText.trim()) {
        return {
          error: "Search API returned empty response",
          hits: [],
          nbHits: 0,
        }
      }

      // Try to parse the JSON
      try {
        const data = JSON.parse(responseText)
        return data
      } catch (parseError) {
        console.error("JSON parsing error:", parseError, "Response text:", responseText.substring(0, 200))
        return {
          error: `Search client error: Failed to parse JSON response. Response starts with: ${responseText.substring(0, 100)}`,
          hits: [],
          nbHits: 0,
        }
      }
    } catch (error) {
      console.error("Response reading error:", error)
      return {
        error: "Search client error: Failed to read search response",
        hits: [],
        nbHits: 0,
      }
    }
  } catch (error) {
    // Re-throw the error with a clear message
    console.error("Search client general error:", error)
    return {
      error:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Search request timed out"
            : error.message
          : "An unexpected error occurred during search",
      hits: [],
      nbHits: 0,
    }
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
