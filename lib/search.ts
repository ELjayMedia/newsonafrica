/**
 * Search utilities for WordPress GraphQL/REST API
 */
import Fuse from "fuse.js"

// Types for search
export interface SearchFilters {
  sort?: "relevance" | "date" | "title"
  categories?: string
  tags?: string
  dateFrom?: string
  dateTo?: string
  fuzzy?: boolean
  fuzzyThreshold?: number
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
    altText?: string
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
  searchSource?: "graphql" | "rest" | "fuzzy"
}

export interface SearchError {
  error: string
  message: string
  retryAfter?: number
}

// Cache for storing all fetched items for fuzzy search
const allItemsCache = new Map<
  string,
  {
    timestamp: number
    items: SearchItem[]
  }
>()

const ALL_ITEMS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes cache TTL for all items

// Types for search parameters
interface SearchParams {
  query: string
  page?: number
  perPage?: number
  fuzzySearch?: boolean
  fuzzyThreshold?: number
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
    fuzzy?: boolean
    fuzzyThreshold?: number
  } = {},
) {
  const {
    page = 1,
    perPage = 10,
    sort,
    categories,
    tags,
    dateFrom,
    dateTo,
    fuzzy = false,
    fuzzyThreshold = 0.3,
  } = options

  try {
    // Build the search URL with all parameters
    let searchUrl = `/api/search?query=${encodeURIComponent(query)}&page=${page}&perPage=${perPage}`

    // Add optional parameters if they exist
    if (sort) searchUrl += `&sort=${sort}`
    if (categories) searchUrl += `&categories=${categories}`
    if (tags) searchUrl += `&tags=${tags}`
    if (dateFrom) searchUrl += `&dateFrom=${dateFrom}`
    if (dateTo) searchUrl += `&dateTo=${dateTo}`
    if (fuzzy) searchUrl += `&fuzzy=true&fuzzyThreshold=${fuzzyThreshold}`

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

// Modify the performSearch function to use the cache and support fuzzy search
export async function performSearch(
  query: string,
  page = 1,
  filters: SearchFilters = {},
  signal?: AbortSignal,
): Promise<SearchResponse | SearchError> {
  try {
    // If fuzzy search is enabled, try to use client-side fuzzy search first
    if (filters.fuzzy && query.length >= 2) {
      const fuzzyResults = await performFuzzySearch(query, page, filters, signal)
      if (fuzzyResults) {
        return fuzzyResults
      }
    }

    // Create a cache key from the search parameters
    const cacheKey = JSON.stringify({ query, page, filters })

    // Check if we have a valid cached result
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

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
    if (filters.fuzzy) {
      params.set("fuzzy", "true")
      if (filters.fuzzyThreshold) {
        params.set("fuzzyThreshold", filters.fuzzyThreshold.toString())
      }
    }

    // Fetch search results with the abort signal
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

    // Parse response
    const data = await response.json()

    // Cache the successful response
    if (!("error" in data)) {
      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        data,
      })

      // If this is a full result set (first page with no filters), cache it for fuzzy search
      if (page === 1 && !filters.categories && !filters.tags && !filters.dateFrom && !filters.dateTo) {
        const cacheKey = filters.sort || "default"
        allItemsCache.set(cacheKey, {
          timestamp: Date.now(),
          items: data.items,
        })
      }
    }

    return data
  } catch (error) {
    // Rethrow AbortError to be handled by the caller
    if (error instanceof Error && error.name === "AbortError") {
      throw error
    }

    console.error("Search error:", error)
    return {
      error: "Search failed",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

/**
 * Performs a fuzzy search using Fuse.js on cached items
 */
async function performFuzzySearch(
  query: string,
  page = 1,
  filters: SearchFilters = {},
  signal?: AbortSignal,
): Promise<SearchResponse | null> {
  // Get the cache key based on sort option
  const cacheKey = filters.sort || "default"

  // Check if we have cached items for fuzzy search
  const cachedItems = allItemsCache.get(cacheKey)

  if (!cachedItems || Date.now() - cachedItems.timestamp > ALL_ITEMS_CACHE_TTL) {
    // If no cached items or cache expired, we need to fetch them first
    // We'll return null to fall back to regular search
    return null
  }

  // Configure Fuse.js options
  const fuseOptions = {
    includeScore: true,
    threshold: filters.fuzzyThreshold || 0.3,
    keys: [
      { name: "title", weight: 0.7 },
      { name: "excerpt", weight: 0.3 },
      { name: "author.name", weight: 0.1 },
    ],
  }

  // Create a new Fuse instance with our cached items
  const fuse = new Fuse(cachedItems.items, fuseOptions)

  // Perform the fuzzy search
  const fuseResults = fuse.search(query)

  // Apply any additional filters
  let filteredResults = fuseResults.map((result) => result.item)

  // Apply category filter if specified
  if (filters.categories) {
    const categoryIds = filters.categories.split(",").map((id) => Number.parseInt(id.trim()))
    filteredResults = filteredResults.filter((item) => item.categories.some((cat) => categoryIds.includes(cat.id)))
  }

  // Apply tag filter if specified
  if (filters.tags) {
    const tagIds = filters.tags.split(",").map((id) => Number.parseInt(id.trim()))
    filteredResults = filteredResults.filter((item) => item.categories.some((cat) => tagIds.includes(cat.id)))
  }

  // Apply date filters if specified
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom)
    filteredResults = filteredResults.filter((item) => new Date(item.date) >= fromDate)
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo)
    filteredResults = filteredResults.filter((item) => new Date(item.date) <= toDate)
  }

  // Apply sorting if needed
  if (filters.sort === "date") {
    filteredResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } else if (filters.sort === "title") {
    filteredResults.sort((a, b) => a.title.localeCompare(b.title))
  }

  // Calculate pagination
  const perPage = 10
  const totalItems = filteredResults.length
  const totalPages = Math.ceil(totalItems / perPage)
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedResults = filteredResults.slice(startIndex, endIndex)

  // Return the search response
  return {
    items: paginatedResults,
    pagination: {
      page,
      perPage,
      totalItems,
      totalPages,
      hasMore: page < totalPages,
    },
    query,
    filters,
    searchSource: "fuzzy",
  }
}

// Add a function to clear the cache when needed
export function clearSearchCache() {
  searchCache.clear()
  allItemsCache.clear()
}

// Add a function to periodically clean up expired cache entries
function cleanupExpiredCache() {
  const now = Date.now()
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key)
    }
  }

  for (const [key, entry] of allItemsCache.entries()) {
    if (now - entry.timestamp > ALL_ITEMS_CACHE_TTL) {
      allItemsCache.delete(key)
    }
  }
}

// Set up periodic cache cleanup
if (typeof window !== "undefined") {
  setInterval(cleanupExpiredCache, 60 * 1000) // Clean up every minute
}

// Update the createDebouncedSearch function to pass the abort signal
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

      try {
        // Perform search
        const result = await performSearch(query, page, filters, controller.signal)

        // Call callback with result
        callback(result)
      } catch (error) {
        // Don't call callback if request was aborted
        if (error instanceof Error && error.name !== "AbortError") {
          callback({
            error: "Search failed",
            message: error.message,
          })
        }
      }

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

// Cache for search results to avoid unnecessary API calls
const searchCache = new Map<string, { results: SearchItem[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Function to generate a cache key based on search parameters
const getCacheKey = (params: SearchParams): string => {
  return `${params.query}_${params.page || 1}_${params.perPage || 10}_${params.fuzzySearch ? "fuzzy" : "exact"}_${params.fuzzyThreshold || 0.3}`
}

// Function to check if cached results are still valid
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_TTL
}

// Function to perform client-side fuzzy search
const performFuzzySearchClientSide = (data: SearchItem[], query: string, threshold = 0.3): SearchItem[] => {
  const options = {
    keys: ["title", "excerpt"],
    includeScore: true,
    threshold: threshold,
  }

  const fuse = new Fuse(data, options)
  const results = fuse.search(query)

  return results.map((result) => result.item)
}

// Main search function
export const searchMain = async (params: SearchParams): Promise<{ results: SearchItem[]; totalPages: number }> => {
  const { query, page = 1, perPage = 10, fuzzySearch = false, fuzzyThreshold = 0.3 } = params

  // Return empty results for empty queries
  if (!query.trim()) {
    return { results: [], totalPages: 0 }
  }

  const cacheKey = getCacheKey(params)
  const cachedData = searchCache.get(cacheKey)

  if (cachedData && isCacheValid(cachedData.timestamp)) {
    return { results: cachedData.results, totalPages: Math.ceil(cachedData.results.length / perPage) }
  }

  try {
    // If fuzzy search is enabled, we need to fetch more results to filter client-side
    const fetchPerPage = fuzzySearch ? perPage * 3 : perPage

    const response = await fetch(
      `/api/search?query=${encodeURIComponent(query)}&page=${page}&perPage=${fetchPerPage}&fuzzy=${fuzzySearch}`,
    )

    if (!response.ok) {
      throw new Error("Search request failed")
    }

    const data = await response.json()
    let results = data.results

    // Apply client-side fuzzy search if enabled
    if (fuzzySearch && results.length > 0) {
      results = performFuzzySearchClientSide(results, query, fuzzyThreshold)
    }

    // Cache the results
    searchCache.set(cacheKey, { results, timestamp: Date.now() })

    return {
      results: results.slice(0, perPage),
      totalPages: Math.ceil(results.length / perPage),
    }
  } catch (error) {
    console.error("Search error:", error)
    return { results: [], totalPages: 0 }
  }
}

// Function to clear search cache
export const clearSearchCacheMain = (): void => {
  searchCache.clear()
}
