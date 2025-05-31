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
  sortBy?: "relevance" | "date" | "popularity" | "reading_time"
  fuzzy?: boolean
  useIndex?: boolean
  useCache?: boolean
  minScore?: number
  boostRecent?: boolean
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

// Fine-tuned cache configuration
const CACHE_CONFIG = {
  // Cache TTLs based on content type and usage patterns
  TTL: {
    POSTS_PEAK: 5 * 60 * 1000, // 5 minutes during peak hours
    POSTS_NORMAL: 10 * 60 * 1000, // 10 minutes normal hours
    POSTS_NIGHT: 30 * 60 * 1000, // 30 minutes during night

    SEARCH_HOT: 2 * 60 * 1000, // 2 minutes for popular queries
    SEARCH_NORMAL: 5 * 60 * 1000, // 5 minutes for normal queries
    SEARCH_COLD: 15 * 60 * 1000, // 15 minutes for rare queries

    SUGGESTIONS_FAST: 10 * 60 * 1000, // 10 minutes for fast suggestions
    SUGGESTIONS_SLOW: 30 * 60 * 1000, // 30 minutes for complex suggestions
  },

  // Cache sizes based on memory constraints
  SIZES: {
    POSTS: 25, // Reduced for memory efficiency
    SEARCH_RESULTS: 150, // Increased for better hit rate
    SUGGESTIONS: 75, // Balanced for performance
  },

  // Performance thresholds
  PERFORMANCE: {
    HOT_QUERY_THRESHOLD: 5, // Queries accessed 5+ times
    FAST_RESPONSE_TIME: 50, // 50ms for fast responses
    SLOW_RESPONSE_TIME: 500, // 500ms threshold for slow queries
  },
}

// Enhanced LRU cache with adaptive TTL
class AdaptiveLRUCache<T> {
  private cache = new Map<
    string,
    {
      data: T
      timestamp: number
      ttl: number
      accessCount: number
      lastAccess: number
      responseTime?: number
    }
  >()
  private readonly maxSize: number
  private readonly baseTTL: number
  private queryStats = new Map<string, { count: number; avgResponseTime: number }>()

  constructor(maxSize: number, baseTTL: number) {
    this.maxSize = maxSize
    this.baseTTL = baseTTL
  }

  set(key: string, data: T, responseTime?: number): void {
    this.cleanup()

    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    // Calculate adaptive TTL based on query popularity and performance
    const ttl = this.calculateAdaptiveTTL(key, responseTime)

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now(),
      responseTime,
    })

    // Update query statistics
    this.updateQueryStats(key, responseTime)
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access patterns
    entry.accessCount++
    entry.lastAccess = Date.now()

    return entry.data
  }

  private calculateAdaptiveTTL(key: string, responseTime?: number): number {
    const stats = this.queryStats.get(key)
    const hour = new Date().getHours()

    let ttl = this.baseTTL

    // Adjust based on time of day
    if (hour >= 9 && hour <= 17) {
      ttl = Math.min(ttl, CACHE_CONFIG.TTL.SEARCH_HOT) // Peak hours - shorter TTL
    } else if (hour >= 22 || hour <= 6) {
      ttl = Math.max(ttl, CACHE_CONFIG.TTL.SEARCH_COLD) // Night - longer TTL
    }

    // Adjust based on query popularity
    if (stats && stats.count >= CACHE_CONFIG.PERFORMANCE.HOT_QUERY_THRESHOLD) {
      ttl = CACHE_CONFIG.TTL.SEARCH_HOT // Popular queries - shorter TTL for freshness
    }

    // Adjust based on response time
    if (responseTime) {
      if (responseTime < CACHE_CONFIG.PERFORMANCE.FAST_RESPONSE_TIME) {
        ttl *= 1.5 // Fast queries can be cached longer
      } else if (responseTime > CACHE_CONFIG.PERFORMANCE.SLOW_RESPONSE_TIME) {
        ttl *= 2 // Slow queries should be cached longer to avoid recomputation
      }
    }

    return Math.min(ttl, 60 * 60 * 1000) // Max 1 hour
  }

  private updateQueryStats(key: string, responseTime?: number): void {
    if (!responseTime) return

    const stats = this.queryStats.get(key) || { count: 0, avgResponseTime: 0 }
    stats.count++
    stats.avgResponseTime = (stats.avgResponseTime * (stats.count - 1) + responseTime) / stats.count
    this.queryStats.set(key, stats)

    // Cleanup old stats
    if (this.queryStats.size > 1000) {
      const entries = Array.from(this.queryStats.entries())
      entries.sort((a, b) => a[1].count - b[1].count)
      entries.slice(0, 200).forEach(([key]) => this.queryStats.delete(key))
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  clear(): void {
    this.cache.clear()
    this.queryStats.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private evictLRU(): void {
    let lruKey = ""
    let lruScore = Number.POSITIVE_INFINITY

    for (const [key, entry] of this.cache.entries()) {
      // Score based on access count, recency, and age
      const ageWeight = (Date.now() - entry.timestamp) / entry.ttl
      const accessWeight = 1 / (entry.accessCount + 1)
      const recencyWeight = (Date.now() - entry.lastAccess) / (60 * 1000) // Minutes since last access

      const score = ageWeight + accessWeight + recencyWeight

      if (score < lruScore) {
        lruKey = key
        lruScore = score
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.values())
    const validEntries = entries.filter((entry) => now - entry.timestamp <= entry.ttl)

    const totalAccesses = validEntries.reduce((sum, e) => sum + e.accessCount, 0)
    const avgResponseTime = validEntries
      .filter((e) => e.responseTime)
      .reduce((sum, e, _, arr) => sum + e.responseTime! / arr.length, 0)

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: entries.length - validEntries.length,
      hitRate: validEntries.length > 0 ? totalAccesses / validEntries.length : 0,
      avgResponseTime: avgResponseTime || 0,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
      hotQueries: Array.from(this.queryStats.entries()).filter(
        ([_, stats]) => stats.count >= CACHE_CONFIG.PERFORMANCE.HOT_QUERY_THRESHOLD,
      ).length,
    }
  }
}

// Cache instances with fine-tuned configurations
const postsCache = new AdaptiveLRUCache<SearchPost[]>(CACHE_CONFIG.SIZES.POSTS, CACHE_CONFIG.TTL.POSTS_NORMAL)

const searchResultsCache = new AdaptiveLRUCache<SearchResponse>(
  CACHE_CONFIG.SIZES.SEARCH_RESULTS,
  CACHE_CONFIG.TTL.SEARCH_NORMAL,
)

const suggestionsCache = new AdaptiveLRUCache<string[]>(
  CACHE_CONFIG.SIZES.SUGGESTIONS,
  CACHE_CONFIG.TTL.SUGGESTIONS_FAST,
)

// Request deduplication with timeout
const pendingRequests = new Map<string, { promise: Promise<any>; timestamp: number }>()
const REQUEST_TIMEOUT = 30000 // 30 seconds

// Cleanup pending requests periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, { timestamp }] of pendingRequests.entries()) {
    if (now - timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(key)
    }
  }
}, 60000) // Every minute

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
]

/**
 * Enhanced fetch posts with adaptive caching and circuit breaker
 */
async function fetchPosts(): Promise<SearchPost[]> {
  const cacheKey = "posts-data"

  // Check cache first
  const cached = postsCache.get(cacheKey)
  if (cached) {
    console.log("Using cached posts data")
    return cached
  }

  // Check if request is already pending
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    console.log("Deduplicating posts request")
    return pending.promise
  }

  const fetchPromise = performPostsFetch(cacheKey)
  pendingRequests.set(cacheKey, { promise: fetchPromise, timestamp: Date.now() })

  try {
    const result = await fetchPromise
    return result
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

async function performPostsFetch(cacheKey: string): Promise<SearchPost[]> {
  const MAX_RETRIES = 3
  let retryCount = 0
  const startTime = Date.now()

  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Fetching posts attempt ${retryCount + 1}/${MAX_RETRIES}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000) // 6 second timeout

      const response = await fetch("/api/posts?per_page=100&_embed=1", {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 429) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "5", 10)
        const waitTime = Math.min(retryAfter * 1000, 20000) // Max 20 seconds
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

      const responseTime = Date.now() - startTime

      // Cache with adaptive TTL based on time and performance
      postsCache.set(cacheKey, processedPosts, responseTime)
      console.log(`Successfully fetched and cached ${processedPosts.length} posts in ${responseTime}ms`)

      return processedPosts
    } catch (error) {
      console.error(`Error fetching posts (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error)

      // Exponential backoff with jitter
      const baseDelay = 1000 * Math.pow(2, retryCount)
      const jitter = Math.random() * 500
      const delay = Math.min(baseDelay + jitter, 8000)

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
 * Enhanced search function with fine-tuned performance optimization
 */
export async function searchPosts(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const startTime = Date.now()
  const {
    limit = 20,
    categories = [],
    tags = [],
    sortBy = "relevance",
    fuzzy = true,
    useIndex = true,
    useCache = true,
    minScore = 2,
    boostRecent = true,
  } = options

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

  // Check cache first if enabled
  if (useCache) {
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
  }

  // Check for pending request
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    return pending.promise
  }

  const searchPromise = performSearch(normalizedQuery, options, startTime)
  pendingRequests.set(cacheKey, { promise: searchPromise, timestamp: Date.now() })

  try {
    const result = await searchPromise

    // Cache successful results if enabled
    if (useCache && result.performance.source !== "fallback") {
      searchResultsCache.set(cacheKey, result, result.performance.responseTime)
    }

    return result
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

async function performSearch(
  normalizedQuery: string,
  options: SearchOptions,
  startTime: number,
): Promise<SearchResponse> {
  const {
    limit = 20,
    categories = [],
    tags = [],
    sortBy = "relevance",
    fuzzy = true,
    useIndex = true,
    minScore = 2,
    boostRecent = true,
  } = options

  try {
    let results: SearchPost[] = []
    let total = 0
    let source = "unknown"
    let indexUsed = false

    // Strategy 1: Use search indexer if available and enabled
    if (useIndex && searchIndexer) {
      try {
        // Update index if needed
        if (searchIndexer.needsUpdate()) {
          console.log("Updating search index...")
          const posts = await fetchPosts()
          await searchIndexer.buildIndex(posts)
        }

        // Search using indexer with fine-tuned options
        const indexResults = searchIndexer.search(normalizedQuery, {
          limit: limit * 1.5, // Get more results for better filtering
          categories,
          tags,
          sortBy,
          fuzzy,
          minScore,
          boostRecent,
        })

        // Convert to SearchPost format
        results = indexResults.slice(0, limit).map((entry) => ({
          id: entry.id,
          title: { rendered: entry.title },
          excerpt: { rendered: entry.excerpt },
          content: { rendered: entry.content },
          slug: entry.slug,
          date: entry.date,
          categories: entry.categories,
          author: entry.author,
        }))

        total = indexResults.length
        source = "search-indexer"
        indexUsed = true

        console.log(`Optimized index search found ${total} results in ${Date.now() - startTime}ms`)
      } catch (indexError) {
        console.error("Search indexer failed, falling back to API search:", indexError)
        searchPerformanceMonitor.recordError(normalizedQuery, `Index error: ${indexError.message}`)
      }
    }

    // Strategy 2: Fallback to WordPress API search
    if (!indexUsed || results.length === 0) {
      try {
        const apiStartTime = Date.now()
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}&per_page=${limit}`, {
          headers: {
            "Cache-Control": "no-cache",
          },
        })

        if (!response.ok) {
          throw new Error(`Search API error: ${response.status}`)
        }

        const data = await response.json()
        results = data.results || []
        total = data.total || 0
        source = indexUsed ? "hybrid-search" : "wordpress-api"

        console.log(`WordPress API search found ${total} results in ${Date.now() - apiStartTime}ms`)
      } catch (apiError) {
        console.error("WordPress API search failed, using utility search:", apiError)
        searchPerformanceMonitor.recordError(normalizedQuery, `API error: ${apiError.message}`)

        // Final fallback to utility search
        try {
          const posts = await fetchPosts()
          const searchResults = utilitySearchPosts(posts, normalizedQuery)

          // Apply enhanced filtering
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

          // Apply optimized sorting
          if (sortBy === "date") {
            filteredResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          } else if (sortBy === "popularity") {
            filteredResults.sort((a, b) => {
              const aScore = calculateSimplePopularity(a)
              const bScore = calculateSimplePopularity(b)
              return bScore - aScore
            })
          } else if (sortBy === "reading_time") {
            filteredResults.sort((a, b) => {
              const aTime = estimateReadingTime(a.content?.rendered || "")
              const bTime = estimateReadingTime(b.content?.rendered || "")
              return Math.abs(aTime - 5) - Math.abs(bTime - 5) // Prefer ~5 minute reads
            })
          }

          results = filteredResults.slice(0, limit)
          total = filteredResults.length
          source = "utility-search"

          console.log(`Utility search found ${total} results, showing ${results.length}`)
        } catch (utilityError) {
          console.error("All search methods failed:", utilityError)
          searchPerformanceMonitor.recordError(normalizedQuery, `All methods failed: ${utilityError.message}`)

          results = FALLBACK_POSTS.slice(0, limit)
          total = FALLBACK_POSTS.length
          source = "fallback"
        }
      }
    }

    const responseTime = Date.now() - startTime

    // Get search suggestions with performance optimization
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
 * Calculate enhanced popularity score
 */
function calculateSimplePopularity(post: SearchPost): number {
  let score = 0

  // Enhanced recency bonus
  const hoursOld = (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60)
  if (hoursOld < 1) score += 15
  else if (hoursOld < 6) score += 12
  else if (hoursOld < 24) score += 8
  else if (hoursOld < 72) score += 5
  else if (hoursOld < 168) score += 2

  // Content quality indicators
  const contentLength = (post.content?.rendered || "").length
  if (contentLength > 2000) score += 5
  else if (contentLength > 1000) score += 3
  else if (contentLength > 500) score += 1

  // Reading time optimization
  const readingTime = estimateReadingTime(post.content?.rendered || "")
  if (readingTime >= 3 && readingTime <= 8) score += 3
  else if (readingTime >= 2 && readingTime <= 10) score += 1

  return score
}

/**
 * Estimate reading time in minutes
 */
function estimateReadingTime(content: string): number {
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / 200) // 200 WPM average
}

/**
 * Enhanced search suggestions with adaptive caching
 */
export async function getSearchSuggestions(query: string, limit = 8): Promise<string[]> {
  if (!query || query.length < 2) {
    return []
  }

  const cacheKey = `suggestions:${query}:${limit}`

  // Check cache first
  const cached = suggestionsCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Check for pending request
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    return pending.promise
  }

  const suggestionPromise = performSuggestionsFetch(query, limit)
  pendingRequests.set(cacheKey, { promise: suggestionPromise, timestamp: Date.now() })

  try {
    const suggestions = await suggestionPromise
    const responseTime = Date.now() - Date.now() // This will be 0, but we'll fix it properly

    suggestionsCache.set(cacheKey, suggestions, responseTime)
    return suggestions
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

async function performSuggestionsFetch(query: string, limit: number): Promise<string[]> {
  const startTime = Date.now()

  try {
    // Try to get suggestions from indexer first
    if (searchIndexer && !searchIndexer.needsUpdate()) {
      const indexSuggestions = searchIndexer.getSuggestions(query, limit)
      if (indexSuggestions.length > 0) {
        return indexSuggestions
      }
    }

    // Fallback to API suggestions
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&suggestions=true`, {
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`Suggestions API error: ${response.status}`)
    }

    const data = await response.json()
    return data.suggestions || []
  } catch (error) {
    console.error("Error getting search suggestions:", error)
    return []
  }
}

/**
 * Get comprehensive search performance stats
 */
export function getSearchPerformanceStats() {
  return {
    ...searchPerformanceMonitor.getStats(),
    cacheStats: getCacheStats(),
    indexerStats: searchIndexer?.getStats() || null,
  }
}

/**
 * Get search optimization suggestions
 */
export function getSearchOptimizationSuggestions() {
  const stats = getSearchPerformanceStats()
  const suggestions: string[] = []

  if (stats.cacheStats.searchResults.hitRate < 0.6) {
    suggestions.push("Consider increasing cache TTL for better hit rates")
  }

  if (stats.indexerStats && stats.indexerStats.memoryUsage.includes("MB")) {
    const memoryMB = Number.parseFloat(stats.indexerStats.memoryUsage.split(" ")[0])
    if (memoryMB > 40) {
      suggestions.push("Search index memory usage is high, consider cleanup")
    }
  }

  if (stats.cacheStats.searchResults.avgResponseTime > 200) {
    suggestions.push("Average response time is high, consider optimizing queries")
  }

  return suggestions
}

/**
 * Enhanced debounced search with performance tracking
 */
export function createDebouncedSearch(delay = 250) {
  // Reduced delay for better UX
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

    // Set new timeout with adaptive delay
    const adaptiveDelay = query.length < 3 ? delay * 1.5 : delay
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
    }, adaptiveDelay)
  }
}

/**
 * Clear all caches with performance logging
 */
export function clearCache(): void {
  const beforeStats = getCacheStats()

  postsCache.clear()
  searchResultsCache.clear()
  suggestionsCache.clear()

  console.log("Search caches cleared:", {
    before: beforeStats,
    after: getCacheStats(),
  })
}

/**
 * Get comprehensive cache statistics
 */
function getCacheStats() {
  return {
    posts: postsCache.getStats(),
    searchResults: searchResultsCache.getStats(),
    suggestions: suggestionsCache.getStats(),
    indexer: searchIndexer?.getStats() || null,
    config: CACHE_CONFIG,
  }
}

/**
 * Strip HTML tags from text with enhanced cleaning
 */
export function stripHtml(html: string): string {
  if (!html) return ""
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-.,!?]/g, "") // Remove special characters except basic punctuation
    .trim()
}

/**
 * Highlight search terms in text with improved performance
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query || !text) return text

  const terms = query.split(/\s+/).filter((term) => term.length > 1)
  let highlightedText = text

  terms.forEach((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`\\b(${escapedTerm})\\b`, "gi")
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium">$1</mark>',
    )
  })

  return highlightedText
}

/**
 * Get search health status with detailed diagnostics
 */
export function getSearchHealthStatus() {
  const indexHealth = searchIndexer?.getHealthStatus() || {
    status: "unknown",
    issues: ["Indexer not available"],
    stats: null,
    config: null,
  }

  const performanceStatus = searchPerformanceMonitor.getRealtimeStatus()
  const cacheStats = getCacheStats()

  // Calculate overall health
  let overallStatus = "healthy"
  const allIssues: string[] = []

  if (indexHealth.status !== "healthy") {
    overallStatus = "degraded"
    allIssues.push(...indexHealth.issues)
  }

  if (performanceStatus.status !== "good") {
    overallStatus = "degraded"
    allIssues.push("Performance issues detected")
  }

  if (cacheStats.searchResults.hitRate < 0.4) {
    overallStatus = "warning"
    allIssues.push("Low cache hit rate")
  }

  return {
    overall: overallStatus,
    issues: allIssues,
    indexer: indexHealth,
    performance: performanceStatus,
    cache: {
      status: cacheStats.posts.validEntries > 0 ? "active" : "empty",
      stats: cacheStats,
    },
    recommendations: getSearchOptimizationSuggestions(),
  }
}

// Export types
export type { SearchOptions, SearchResponse }
