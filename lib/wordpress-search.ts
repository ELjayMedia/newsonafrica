import { getCountryEndpoints } from "./getCountryEndpoints"

// Search result interface
export interface WordPressSearchResult {
  id: number
  title: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  content: {
    rendered: string
  }
  slug: string
  date: string
  link: string
  featured_media: number
  categories: number[]
  tags: number[]
  author: number
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string
      alt_text: string
    }>
    "wp:term"?: Array<
      Array<{
        id: number
        name: string
        slug: string
      }>
    >
    author?: Array<{
      id: number
      name: string
      slug: string
    }>
  }
}

export interface SearchResponse {
  results: WordPressSearchResult[]
  total: number
  totalPages: number
  currentPage: number
  hasMore: boolean
  query: string
  searchTime: number
  suggestions?: string[]
}

// Cache for search results with basic LRU behavior
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const searchCache = new Map<string, CacheEntry<SearchResponse>>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_MAX_ENTRIES = 100
const CACHE_CLEANUP_INTERVAL = 60_000 // 1 minute

let cacheHits = 0
let cacheMisses = 0
let lastCleanup = 0

function cleanupCache(): void {
  const now = Date.now()
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      searchCache.delete(key)
    }
  }
}

function maybeCleanupCache(): void {
  const now = Date.now()
  if (now - lastCleanup > CACHE_CLEANUP_INTERVAL) {
    cleanupCache()
    lastCleanup = now
  }
}

function getFromCache(key: string): SearchResponse | undefined {
  maybeCleanupCache()
  const entry = searchCache.get(key)
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    cacheHits++
    // Refresh order for LRU
    searchCache.delete(key)
    searchCache.set(key, entry)
    return entry.data
  }
  if (entry) {
    searchCache.delete(key)
  }
  cacheMisses++
  return undefined
}

function setCache(key: string, data: SearchResponse): void {
  maybeCleanupCache()
  if (searchCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value
    if (oldestKey !== undefined) {
      searchCache.delete(oldestKey)
    }
  }
  searchCache.set(key, { data, timestamp: Date.now(), ttl: CACHE_DURATION })
}

/**
 * Search WordPress posts using REST API
 */
export async function searchWordPressPosts(
  query: string,
  options: {
    page?: number
    perPage?: number
    categories?: number[]
    tags?: number[]
    author?: number
    orderBy?: "relevance" | "date" | "title"
    order?: "asc" | "desc"
  } = {},
  countryCode?: string,
): Promise<SearchResponse> {
  const startTime = Date.now()

  const { page = 1, perPage = 20, categories = [], tags = [], author, orderBy = "relevance", order = "desc" } = options

  // Create cache key
  const cacheKey = `search:${query}:${JSON.stringify(options)}`

  // Check cache first
  const cached = getFromCache(cacheKey)
  if (cached) {
    return {
      ...cached,
      searchTime: Date.now() - startTime,
    }
  }

  try {
    // Build search parameters
    const searchParams = new URLSearchParams({
      search: query,
      page: page.toString(),
      per_page: perPage.toString(),
      _embed: "1", // Include embedded data (featured media, terms, author)
      orderby: orderBy === "relevance" ? "relevance" : orderBy,
      order: order,
    })

    // Add category filter
    if (categories.length > 0) {
      searchParams.append("categories", categories.join(","))
    }

    // Add tag filter
    if (tags.length > 0) {
      searchParams.append("tags", tags.join(","))
    }

    // Add author filter
    if (author) {
      searchParams.append("author", author.toString())
    }

    const { rest } = getCountryEndpoints(countryCode)
    const response = await fetch(`${rest}/wp-json/wp/v2/posts?${searchParams}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
    }

    const posts: WordPressSearchResult[] = await response.json()

    // Get total count from headers
    const totalPosts = Number.parseInt(response.headers.get("X-WP-Total") || "0", 10)
    const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") || "1", 10)

    const searchResponse: SearchResponse = {
      results: posts,
      total: totalPosts,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages,
      query,
      searchTime: Date.now() - startTime,
    }

    // Cache the result
    setCache(cacheKey, searchResponse)

    return searchResponse
  } catch (error) {
    console.error("WordPress search error:", error)

    // Return empty results on error
    return {
      results: [],
      total: 0,
      totalPages: 0,
      currentPage: page,
      hasMore: false,
      query,
      searchTime: Date.now() - startTime,
    }
  }
}

/**
 * Get search suggestions from WordPress
 */
export async function getSearchSuggestions(
  query: string,
  limit = 8,
  countryCode?: string,
): Promise<string[]> {
  if (!query || query.length < 2) return []

  try {
    // Search for posts to extract suggestions
    const { rest } = getCountryEndpoints(countryCode)
    const response = await fetch(
      `${rest}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=20&_fields=title,categories,tags&_embed=1`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) return []

    const posts: any[] = await response.json()
    const suggestions = new Set<string>()

    posts.forEach((post) => {
      // Extract words from titles
      const titleWords = post.title.rendered
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && word.includes(query.toLowerCase()))

      titleWords.forEach((word: string) => {
        if (suggestions.size < limit) {
          suggestions.add(word)
        }
      })

      // Add category names if embedded
      if (post._embedded?.["wp:term"]?.[0]) {
        post._embedded["wp:term"][0].forEach((category: any) => {
          if (category.name.toLowerCase().includes(query.toLowerCase()) && suggestions.size < limit) {
            suggestions.add(category.name.toLowerCase())
          }
        })
      }
    })

    return Array.from(suggestions).slice(0, limit)
  } catch (error) {
    console.error("Error getting search suggestions:", error)
    return []
  }
}

/**
 * Search categories
 */
export async function searchCategories(query: string, countryCode?: string): Promise<any[]> {
  try {
    const { rest } = getCountryEndpoints(countryCode)
    const response = await fetch(
      `${rest}/wp-json/wp/v2/categories?search=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    console.error("Error searching categories:", error)
    return []
  }
}

/**
 * Search tags
 */
export async function searchTags(query: string, countryCode?: string): Promise<any[]> {
  try {
    const { rest } = getCountryEndpoints(countryCode)
    const response = await fetch(`${rest}/wp-json/wp/v2/tags?search=${encodeURIComponent(query)}&per_page=10`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    console.error("Error searching tags:", error)
    return []
  }
}

/**
 * Get popular search terms (mock implementation - you could store this in WordPress)
 */
export function getPopularSearchTerms(): string[] {
  return ["politics", "business", "technology", "sports", "entertainment", "health", "education", "economy"]
}

/**
 * Clear search cache
 */
export function clearSearchCache(): void {
  searchCache.clear()
  cacheHits = 0
  cacheMisses = 0
  lastCleanup = Date.now()
}

/**
 * Get search cache statistics
 */
export function getSearchCacheStats() {
  maybeCleanupCache()
  return {
    hits: cacheHits,
    misses: cacheMisses,
    size: searchCache.size,
  }
}

/**
 * Format search result excerpt
 */
export function formatSearchExcerpt(excerpt: string, maxLength = 150): string {
  // Remove HTML tags
  const cleanExcerpt = excerpt.replace(/<[^>]*>/g, "").trim()

  if (cleanExcerpt.length <= maxLength) {
    return cleanExcerpt
  }

  // Truncate at word boundary
  const truncated = cleanExcerpt.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(" ")

  return lastSpace > 0 ? truncated.substring(0, lastSpace) + "..." : truncated + "..."
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery) return text

  const terms = searchQuery.split(/\s+/).filter((term) => term.length > 1)
  let highlightedText = text

  terms.forEach((term) => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  })

  return highlightedText
}
