import { searchPosts as utilitySearchPosts } from "./searchPosts"
import { searchIndexer } from "./search-indexer"
import { searchPerformanceMonitor } from "./search-performance"

// Types for search
export interface SearchPost {
  id: string
  title: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  content?: {
    rendered: string
  }
  slug: string
  date: string
  featured_media?: number
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string
      alt_text?: string
    }>
  }
  categories?: number[]
  author?: number
  _links?: any
}

export interface SearchOptions {
  limit?: number
  categories?: string[]
  tags?: string[]
  sortBy?: "relevance" | "date" | "popularity"
  fuzzy?: boolean
  useIndex?: boolean
}

export interface SearchResponse {
  results: SearchPost[]
  total: number
  query: string
  performance: {
    responseTime: number
    source: string
    cached: boolean
    indexUsed?: boolean
  }
  suggestions?: string[]
}

// Enhanced cache management
class SearchCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 100

  set(key: string, data: any, ttl = this.DEFAULT_TTL): void {
    // Clean old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    })

    // If still too many, remove oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key))
        .sort((a, b) => a[1].timestamp - b[1].timestamp)

      const toRemove = sortedEntries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2))
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.values())
    const validEntries = entries.filter((entry) => now - entry.timestamp <= entry.ttl)

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: entries.length - validEntries.length,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
    }
  }
}

// Cache instances
const postsCache = new SearchCache()
const searchResultsCache = new SearchCache()

// Fallback posts for when API fails
const FALLBACK_POSTS: SearchPost[] = [
  {
    id: "fallback-1",
    title: { rendered: "Search Service Temporarily Unavailable" },
    excerpt: {
      rendered: "We're experiencing difficulties with our search service. Please try again in a few moments.",
    },
    slug: "search-unavailable",
    date: new Date().toISOString(),
    categories: [],
    author: 0,
  },
  {
    id: "fallback-2",
    title: { rendered: "Limited Search Results" },
    excerpt: {
      rendered: "Search functionality is currently limited. We're working to restore full service.",
    },
    slug: "limited-search",
    date: new Date().toISOString(),
    categories: [],
    author: 0,
  },
]

/**
 * Enhanced fetch posts with better error handling and retry logic
 */
async function fetchPosts(): Promise<SearchPost[]> {
  const cacheKey = "posts-data"
  const cached = postsCache.get(cacheKey)
  if (cached) {
    console.log("Using cached posts data")
    return cached
  }

  const MAX_RETRIES = 3
  let retryCount = 0

  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Fetching posts attempt ${retryCount + 1}/${MAX_RETRIES}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch("/api/posts?per_page=100&_embed=1", {
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 429) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "5", 10)
        const waitTime = Math.min(retryAfter * 1000, 30000) // Max 30 seconds
        console.warn(`Rate limited. Waiting ${waitTime}ms before retrying...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        retryCount++
        continue
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const posts = Array.isArray(data) ? data : data.data || []

      const processedPosts = posts.map((post: any) => ({
        id: post.id?.toString() || `temp-${Date.now()}-${Math.random()}`,
        title: {
          rendered: post.title?.rendered || post.title || "Untitled",
        },
        excerpt: {
          rendered: post.excerpt?.rendered || post.excerpt || "",
        },
        content: {
          rendered: post.content?.rendered || post.content || "",
        },
        slug: post.slug || "",
        date: post.date || new Date().toISOString(),
        featured_media: post.featured_media,
        _embedded: post._embedded,
        categories: post.categories || [],
        author: post.author,
        _links: post._links,
      }))

      // Cache the results
      postsCache.set(cacheKey, processedPosts, 10 * 60 * 1000) // 10 minutes
      console.log(`Successfully fetched and cached ${processedPosts.length} posts`)

      return processedPosts
    } catch (error) {
      console.error(`Error fetching posts (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error)

      // Exponential backoff with jitter
      const baseDelay = 1000 * Math.pow(2, retryCount)
      const jitter = Math.random() * 1000
      const delay = Math.min(baseDelay + jitter, 10000)

      if (retryCount < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      retryCount++
    }
  }

  console.error("All fetch attempts failed, using fallback data")
  searchPerformanceMonitor.recordError("fetch-posts", "All attempts failed")
  return FALLBACK_POSTS
}

/**
 * Enhanced search function with multiple strategies
 */
export async function searchPosts(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const startTime = Date.now()
  const { limit = 20, categories = [], tags = [], sortBy = "relevance", fuzzy = true, useIndex = true } = options

  // Return empty results for invalid queries
  if (!query || query.trim().length < 2) {
    return {
      results: [],
      total: 0,
      query: query.trim(),
      performance: {
        responseTime: Date.now() - startTime,
        source: "empty-query",
        cached: false,
      },
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const cacheKey = `search:${normalizedQuery}:${JSON.stringify(options)}`

  // Check cache first
  const cachedResult = searchResultsCache.get(cacheKey)
  if (cachedResult) {
    const responseTime = Date.now() - startTime
    searchPerformanceMonitor.recordSearch(normalizedQuery, responseTime, cachedResult.results.length, "cache", true)

    return {
      ...cachedResult,
      performance: {
        ...cachedResult.performance,
        responseTime,
        cached: true,
      },
    }
  }

  try {
    let results: SearchPost[] = []
    let total = 0
    let source = "unknown"
    let indexUsed = false
    let useIndexLocal = useIndex // Use a local variable for useIndex

    // Strategy 1: Use search indexer if available and enabled
    if (useIndexLocal && searchIndexer) {
      try {
        // Update index if needed
        if (searchIndexer.needsUpdate()) {
          console.log("Updating search index...")
          const posts = await fetchPosts()
          await searchIndexer.buildIndex(posts)
        }

        // Search using indexer
        const indexResults = searchIndexer.search(normalizedQuery, {
          limit,
          categories,
          tags,
          sortBy,
          fuzzy,
        })

        // Convert to SearchPost format
        results = indexResults.map((entry) => ({
          id: entry.id,
          title: { rendered: entry.title },
          excerpt: { rendered: entry.excerpt },
          content: { rendered: entry.content },
          slug: entry.slug,
          date: entry.date,
          categories: entry.categories,
          author: entry.author,
        }))

        total = results.length
        source = "search-indexer"
        indexUsed = true

        console.log(`Index search found ${results.length} results`)
      } catch (indexError) {
        console.error("Search indexer failed, falling back to utility search:", indexError)
        useIndexLocal = false // Disable for this search
      }
    }

    // Strategy 2: Fallback to utility search
    if (!useIndexLocal || results.length === 0) {
      try {
        const posts = await fetchPosts()
        const searchResults = utilitySearchPosts(posts, normalizedQuery)

        // Apply additional filtering
        let filteredResults = searchResults

        if (categories.length > 0) {
          filteredResults = filteredResults.filter((post) =>
            post.categories?.some((catId) => categories.some((cat) => cat.toLowerCase().includes(catId.toString()))),
          )
        }

        if (tags.length > 0) {
          filteredResults = filteredResults.filter((post) =>
            post._embedded?.["wp:term"]?.[1]?.some((tag: any) =>
              tags.some((t) => tag.name.toLowerCase().includes(t.toLowerCase())),
            ),
          )
        }

        // Apply sorting
        if (sortBy === "date") {
          filteredResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        } else if (sortBy === "popularity") {
          // Simple popularity based on recency and content length
          filteredResults.sort((a, b) => {
            const aScore = calculateSimplePopularity(a)
            const bScore = calculateSimplePopularity(b)
            return bScore - aScore
          })
        }

        results = filteredResults.slice(0, limit)
        total = filteredResults.length
        source = indexUsed ? "hybrid-search" : "utility-search"

        console.log(`Utility search found ${total} results, showing ${results.length}`)
      } catch (utilityError) {
        console.error("Utility search failed:", utilityError)
        searchPerformanceMonitor.recordError(normalizedQuery, utilityError.message)

        results = FALLBACK_POSTS.slice(0, limit)
        total = FALLBACK_POSTS.length
        source = "fallback"
      }
    }

    const responseTime = Date.now() - startTime

    // Get search suggestions
    const suggestions = await getSearchSuggestions(normalizedQuery, 5)

    const response: SearchResponse = {
      results,
      total,
      query: normalizedQuery,
      performance: {
        responseTime,
        source,
        cached: false,
        indexUsed,
      },
      suggestions,
    }

    // Cache successful results
    if (source !== "fallback") {
      const cacheTTL = source === "search-indexer" ? 10 * 60 * 1000 : 5 * 60 * 1000
      searchResultsCache.set(cacheKey, response, cacheTTL)
    }

    // Record performance metrics
    searchPerformanceMonitor.recordSearch(normalizedQuery, responseTime, results.length, source, false)

    return response
  } catch (error) {
    console.error("Search failed completely:", error)
    searchPerformanceMonitor.recordError(normalizedQuery, error.message)

    const responseTime = Date.now() - startTime

    return {
      results: FALLBACK_POSTS.slice(0, limit),
      total: FALLBACK_POSTS.length,
      query: normalizedQuery,
      performance: {
        responseTime,
        source: "error-fallback",
        cached: false,
      },
    }
  }
}

/**
 * Calculate simple popularity score
 */
function calculateSimplePopularity(post: SearchPost): number {
  let score = 0

  // Recency bonus
  const daysSincePublished = (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSincePublished < 1) score += 10
  else if (daysSincePublished < 7) score += 5
  else if (daysSincePublished < 30) score += 2

  // Content length bonus
  const contentLength = (post.content?.rendered || "").length
  if (contentLength > 1000) score += 3
  else if (contentLength > 500) score += 1

  return score
}

/**
 * Enhanced search suggestions
 */
export async function getSearchSuggestions(query: string, limit = 8): Promise<string[]> {
  try {
    // Try to get suggestions from indexer first
    if (searchIndexer && !searchIndexer.needsUpdate()) {
      return searchIndexer.getSuggestions(query, limit)
    }

    // Fallback to simple suggestions
    const posts = await fetchPosts()
    const suggestions = new Set<string>()
    const queryLower = query.toLowerCase()

    posts.forEach((post) => {
      // Title word suggestions
      const titleWords = post.title.rendered.toLowerCase().split(/\s+/)
      titleWords.forEach((word) => {
        if (word.includes(queryLower) && word.length > queryLower.length && word.length > 2) {
          suggestions.add(word)
        }
      })

      // Category suggestions
      if (post._embedded?.["wp:term"]?.[0]) {
        post._embedded["wp:term"][0].forEach((category: any) => {
          if (category.name.toLowerCase().includes(queryLower)) {
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
 * Get comprehensive search performance stats
 */
export function getSearchPerformanceStats() {
  return searchPerformanceMonitor.getStats()
}

/**
 * Get search optimization suggestions
 */
export function getSearchOptimizationSuggestions() {
  return searchPerformanceMonitor.getOptimizationSuggestions()
}

/**
 * Enhanced debounced search with better performance
 */
export function createDebouncedSearch(delay = 300) {
  let timeoutId: NodeJS.Timeout | null = null
  let lastQuery = ""
  let lastOptions: SearchOptions | undefined

  return (query: string, callback: (results: SearchResponse) => void, options?: SearchOptions) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // If query and options haven't changed, don't search again
    if (query === lastQuery && JSON.stringify(options) === JSON.stringify(lastOptions)) {
      return
    }

    lastQuery = query
    lastOptions = options

    // Set new timeout
    timeoutId = setTimeout(async () => {
      try {
        const searchResults = await searchPosts(query, options)
        callback(searchResults)
      } catch (error) {
        console.error("Debounced search error:", error)
        callback({
          results: [],
          total: 0,
          query,
          performance: {
            responseTime: 0,
            source: "error",
            cached: false,
          },
        })
      }
    }, delay)
  }
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  postsCache.clear()
  searchResultsCache.clear()
  console.log("All search caches cleared")
}

/**
 * Get comprehensive cache statistics
 */
export function getCacheStats() {
  return {
    posts: postsCache.getStats(),
    searchResults: searchResultsCache.getStats(),
    indexer: searchIndexer?.getStats() || null,
  }
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string): string {
  if (!html) return ""
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query || !text) return text

  const terms = query.split(/\s+/).filter((term) => term.length > 1)
  let highlightedText = text

  terms.forEach((term) => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>',
    )
  })

  return highlightedText
}

/**
 * Get search health status
 */
export function getSearchHealthStatus() {
  const indexHealth = searchIndexer?.getHealthStatus() || { status: "unknown", issues: ["Indexer not available"] }
  const performanceStatus = searchPerformanceMonitor.getRealtimeStatus()
  const cacheStats = getCacheStats()

  return {
    overall: indexHealth.status === "healthy" && performanceStatus.status === "good" ? "healthy" : "degraded",
    indexer: indexHealth,
    performance: performanceStatus,
    cache: {
      status: cacheStats.posts.validEntries > 0 ? "active" : "empty",
      stats: cacheStats,
    },
  }
}

// Export types
export type { SearchOptions, SearchResponse }
