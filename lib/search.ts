/**
 * Performs a search using the server-side API with enhanced options
 */
export async function search(
  query: string,
  options: {
    page?: number
    hitsPerPage?: number
    sort?: "relevance" | "date" | "title"
    categories?: string
    tags?: string
    dateFrom?: string
    dateTo?: string
  } = {},
) {
  const { page = 0, hitsPerPage = 10, sort, categories, tags, dateFrom, dateTo } = options

  try {
    // Convert to 1-based pagination for WordPress
    const wpPage = page + 1

    // Build the search URL with all parameters
    let searchUrl = `/api/search?query=${encodeURIComponent(query)}&page=${wpPage}&hitsPerPage=${hitsPerPage}`

    // Add optional parameters if they exist
    if (sort) searchUrl += `&sort=${sort}`
    if (categories) searchUrl += `&categories=${categories}`
    if (tags) searchUrl += `&tags=${tags}`
    if (dateFrom) searchUrl += `&dateFrom=${dateFrom}`
    if (dateTo) searchUrl += `&dateTo=${dateTo}`

    // Add cache control and timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout (increased)

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    clearTimeout(timeoutId)

    // Handle rate limiting specifically
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "60"
      return {
        hits: [],
        nbHits: 0,
        page,
        nbPages: 0,
        error: "Rate limit exceeded. Please try again later.",
        isError: true,
        isRateLimited: true,
        retryAfter: Number.parseInt(retryAfter, 10),
      }
    }

    if (!response.ok) {
      throw new Error(`Search request failed with status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Search error:", error)

    // Return a structured error response
    return {
      hits: [],
      nbHits: 0,
      page,
      nbPages: 0,
      error: error instanceof Error ? error.message : "Search failed",
      isError: true,
    }
  }
}

// Implement exponential backoff for retries
let retryCount = 0
const maxRetries = 3
const baseDelay = 1000 // 1 second

// Debounced search function with retry capability
export function createDebouncedSearch(delay = 300) {
  let timeoutId: NodeJS.Timeout | null = null

  return (query: string, options = {}, callback: (results: any) => void) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      try {
        const results = await search(query, options)

        // Reset retry count on success
        retryCount = 0

        callback(results)
      } catch (error) {
        if (retryCount < maxRetries) {
          // Exponential backoff
          const retryDelay = baseDelay * Math.pow(2, retryCount)
          retryCount++

          console.log(`Search failed, retrying in ${retryDelay}ms (attempt ${retryCount} of ${maxRetries})`)

          setTimeout(async () => {
            const results = await search(query, options)
            callback(results)
          }, retryDelay)
        } else {
          // Max retries reached, reset counter and return error
          retryCount = 0
          callback({
            hits: [],
            nbHits: 0,
            page: options.page || 0,
            nbPages: 0,
            error: "Search failed after multiple attempts",
            isError: true,
          })
        }
      }
    }, delay)
  }
}
