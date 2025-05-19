/**
 * Search utilities for WordPress GraphQL/REST API
 */

// Types for search
export interface SearchFilters {
  sort?: "relevance" | "date" | "title"
  categories?: string
  tags?: string
  dateFrom?: string
  dateTo?: string
}

export interface SearchPagination {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  hasMore: boolean
}

export interface SearchItem {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  featuredImage: {
    sourceUrl: string
  } | null
  categories: Array<{
    id: number
    name: string
    slug: string
  }>
  author: {
    name: string
    slug: string
  }
}

export interface SearchResponse {
  items: SearchItem[]
  pagination: SearchPagination
  query: string
  filters: SearchFilters
  searchSource?: "graphql" | "rest"
}

export interface SearchError {
  error: string
  message: string
  retryAfter?: number
}

/**
 * Performs a search using the server-side API with enhanced options
 */
export async function search(
  query: string,
  options: {
    page?: number
    perPage?: number
    sort?: "relevance" | "date" | "title"
    categories?: string
    tags?: string
    dateFrom?: string
    dateTo?: string
  } = {},
) {
  const { page = 1, perPage = 10, sort, categories, tags, dateFrom, dateTo } = options

  try {
    // Build the search URL with all parameters
    let searchUrl = `/api/search?query=${encodeURIComponent(query)}&page=${page}&perPage=${perPage}`

    // Add optional parameters if they exist
    if (sort) searchUrl += `&sort=${sort}`
    if (categories) searchUrl += `&categories=${categories}`
    if (tags) searchUrl += `&tags=${tags}`
    if (dateFrom) searchUrl += `&dateFrom=${dateFrom}`
    if (dateTo) searchUrl += `&dateTo=${dateTo}`

    // Add cache control and timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      next: { revalidate: 60 }, // Cache for 1 minute
      cache: "no-store", // Don't cache rate limited responses
    })

    clearTimeout(timeoutId)

    // Handle rate limiting specifically
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "60"
      return {
        items: [],
        pagination: {
          page,
          perPage,
          totalItems: 0,
          totalPages: 0,
          hasMore: false,
        },
        error: "Rate limit exceeded. Please try again in a few moments.",
        isError: true,
        isRateLimited: true,
        retryAfter: Number.parseInt(retryAfter, 10),
      }
    }

    if (!response.ok) {
      throw new Error(`Search request failed with status: ${response.status}`)
    }

    const data = await response.json()
    return {
      ...data,
      isError: false,
      isRateLimited: false,
    }
  } catch (error) {
    console.error("Search error:", error)

    // Return a structured error response
    return {
      items: [],
      pagination: {
        page,
        perPage,
        totalItems: 0,
        totalPages: 0,
        hasMore: false,
      },
      error: error instanceof Error ? error.message : "Search failed",
      isError: true,
      isRateLimited: false,
    }
  }
}

// Function to perform search
export async function performSearch(
  query: string,
  page = 1,
  filters: SearchFilters = {},
  signal?: AbortSignal,
): Promise<SearchResponse | SearchError> {
  try {
    // Build search URL with parameters
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      perPage: "10", // Default to 10 items per page
    })

    // Add filters if provided
    if (filters.sort) params.set("sort", filters.sort)
    if (filters.categories) params.set("categories", filters.categories)
    if (filters.tags) params.set("tags", filters.tags)
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
    if (filters.dateTo) params.set("dateTo", filters.dateTo)

    // Fetch search results
    const response = await fetch(`/api/search?${params.toString()}`, {
      signal,
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "60", 10)
      return {
        error: "Rate limit exceeded",
        message: "Too many search requests. Please try again later.",
        retryAfter,
      }
    }

    // Handle other errors
    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`)
    }

    // Parse and return response
    return await response.json()
  } catch (error) {
    console.error("Search error:", error)
    return {
      error: "Search failed",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Function to create a debounced search function
export function createDebouncedSearch(delay = 300) {
  let timeoutId: NodeJS.Timeout | null = null
  let controller: AbortController | null = null

  return (
    query: string,
    page: number,
    filters: SearchFilters,
    callback: (result: SearchResponse | SearchError) => void,
  ) => {
    // Cancel previous request if any
    if (controller) {
      controller.abort()
    }

    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Set new timeout
    timeoutId = setTimeout(async () => {
      // Create new abort controller
      controller = new AbortController()

      // Perform search
      const result = await performSearch(query, page, filters, controller.signal)

      // Call callback with result
      callback(result)

      // Reset controller
      controller = null
    }, delay)
  }
}

// Function to format search excerpt by removing HTML tags
export function formatExcerpt(excerpt: string): string {
  // Remove HTML tags
  const text = excerpt.replace(/<\/?[^>]+(>|$)/g, "")

  // Decode HTML entities
  const decoded = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")

  // Trim and limit length
  return decoded.trim().length > 150 ? decoded.trim().substring(0, 150) + "..." : decoded.trim()
}

// Function to highlight search terms in text
export function highlightSearchTerms(text: string, query: string): string {
  if (!query || !text) return text

  // Split query into words
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2) // Only highlight words with 3+ characters

  if (words.length === 0) return text

  // Create regex pattern for all words
  const pattern = new RegExp(`(${words.join("|")})`, "gi")

  // Replace matches with highlighted version
  return text.replace(pattern, "<mark>$1</mark>")
}
