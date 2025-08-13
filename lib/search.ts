import { searchPosts as utilitySearchPosts } from "./searchPosts"

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
  }
  suggestions?: string[]
}

// Cache configuration
const CACHE_CONFIG = {
  TTL: {
    POSTS: 10 * 60 * 1000, // 10 minutes
    SEARCH: 5 * 60 * 1000, // 5 minutes
    SUGGESTIONS: 10 * 60 * 1000, // 10 minutes
  },
  SIZES: {
    POSTS: 25,
    SEARCH_RESULTS: 100,
    SUGGESTIONS: 50,
  },
}

// Simple LRU cache implementation
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>()
  private readonly maxSize: number
  private readonly ttl: number

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }
}

// Cache instances
const postsCache = new SimpleCache<SearchPost[]>(CACHE_CONFIG.SIZES.POSTS, CACHE_CONFIG.TTL.POSTS)
const searchResultsCache = new SimpleCache<SearchResponse>(CACHE_CONFIG.SIZES.SEARCH_RESULTS, CACHE_CONFIG.TTL.SEARCH)
const suggestionsCache = new SimpleCache<string[]>(CACHE_CONFIG.SIZES.SUGGESTIONS, CACHE_CONFIG.TTL.SUGGESTIONS)

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
 * Fetch posts with caching. A limit can be provided to avoid pulling
 * more posts into memory than necessary. An AbortSignal is also
 * supported so callers can cancel the request when a faster source
 * returns.
 */
async function fetchPosts(limit = 20, signal?: AbortSignal): Promise<SearchPost[]> {
  const cacheKey = `posts-data-${limit}`

  // Check cache first
  const cached = postsCache.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(`/api/posts?per_page=${limit}&_embed=1`, {
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    })

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
    postsCache.set(cacheKey, processedPosts)
    return processedPosts
  } catch (error) {
    console.error("Error fetching posts:", error)
    return FALLBACK_POSTS
  }
}

/**
 * Search posts using WordPress API
 */
export async function searchPosts(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const startTime = Date.now()
  const {
    limit = 20,
    categories = [],
    tags = [],
    sortBy = "relevance",
    fuzzy = true,
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
      return {
        ...cachedResult,
        performance: {
          ...cachedResult.performance,
          responseTime: Date.now() - startTime,
          cached: true,
        },
      }
    }
  }

  try {
    const categoryParams = categories.length > 0 ? `&categories=${categories.join(",")}` : ""
    const tagParams = tags.length > 0 ? `&tags=${tags.join(",")}` : ""
    const sortParam = sortBy === "date" ? "&orderby=date&order=desc" : ""

    const apiController = new AbortController()
    const localController = new AbortController()

    const apiPromise = (async (): Promise<SearchResponse | null> => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(normalizedQuery)}&per_page=${limit}${categoryParams}${tagParams}${sortParam}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            signal: apiController.signal,
          },
        )

        if (!response.ok) {
          throw new Error(`Search API error: ${response.status}`)
        }

        const data = await response.json()
        const results = (data.results || []).slice(0, limit)
        const total = data.total || results.length

        const suggestions = await getSearchSuggestions(normalizedQuery, 5)

        const responseTime = Date.now() - startTime
        return {
          results,
          total,
          query: normalizedQuery,
          performance: {
            responseTime,
            source: "wordpress-api",
            cached: false,
          },
          suggestions,
        }
      } catch (err) {
        return null
      }
    })()

    const localPromise = (async (): Promise<SearchResponse | null> => {
      try {
        const posts = await fetchPosts(limit, localController.signal)
        const searchResults = utilitySearchPosts(posts, normalizedQuery)

        let filteredResults = searchResults

        if (categories.length > 0) {
          filteredResults = filteredResults.filter((post) =>
            post.categories?.some((catId) =>
              categories.some((cat) => cat.toLowerCase().includes(catId.toString())),
            ),
          )
        }

        if (tags.length > 0) {
          filteredResults = filteredResults.filter((post) =>
            post._embedded?.["wp:term"]?.[1]?.some((tag: any) =>
              tags.some((t) => tag.name.toLowerCase().includes(t.toLowerCase())),
            ),
          )
        }

        if (sortBy === "date") {
          filteredResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }

        const results = filteredResults.slice(0, limit)
        const total = filteredResults.length
        const responseTime = Date.now() - startTime

        return {
          results,
          total,
          query: normalizedQuery,
          performance: {
            responseTime,
            source: "utility-search",
            cached: false,
          },
        }
      } catch (err) {
        return null
      }
    })()

    const first = await Promise.race([
      apiPromise.then((res) => ({ source: "api" as const, res })),
      localPromise.then((res) => ({ source: "local" as const, res })),
    ])

    let finalResponse: SearchResponse | null = null

    if (first.res && first.res.results.length >= limit) {
      // We have satisfactory results, cancel the other fetch
      if (first.source === "api") {
        localController.abort()
      } else {
        apiController.abort()
      }
      finalResponse = first.res
    } else {
      const other = first.source === "api" ? await localPromise : await apiPromise
      const mergedResults = [...(first.res?.results || []), ...(other?.results || [])].slice(0, limit)
      const total = (first.res?.total || 0) + (other?.total || 0)

      finalResponse = {
        results: mergedResults,
        total,
        query: normalizedQuery,
        performance: {
          responseTime: Date.now() - startTime,
          source: `${first.source}-${first.source === "api" ? "local" : "api"}`,
          cached: false,
        },
        suggestions: first.res?.suggestions || other?.suggestions,
      }
    }

    if (useCache && finalResponse) {
      searchResultsCache.set(cacheKey, finalResponse)
    }

    return finalResponse!
  } catch (error) {
    console.error("Search failed completely:", error)

    return {
      results: FALLBACK_POSTS.slice(0, limit),
      total: FALLBACK_POSTS.length,
      query: normalizedQuery,
      performance: {
        responseTime: Date.now() - startTime,
        source: "error-fallback",
        cached: false,
      },
    }
  }
}

/**
 * Get search suggestions
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

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&suggestions=true`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Suggestions API error: ${response.status}`)
    }

    const data = await response.json()
    const suggestions = data.suggestions || []

    // Cache suggestions
    suggestionsCache.set(cacheKey, suggestions)
    return suggestions
  } catch (error) {
    console.error("Error getting search suggestions:", error)
    return []
  }
}

/**
 * Create debounced search function
 */
export function createDebouncedSearch(delay = 250) {
  let timeoutId: NodeJS.Timeout | null = null
  let lastQuery = ""

  return (query: string, callback: (results: SearchResponse) => void, options?: SearchOptions) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // If query hasn't changed, don't search again
    if (query === lastQuery) {
      return
    }

    lastQuery = query

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
  suggestionsCache.clear()
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
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`\\b(${escapedTerm})\\b`, "gi")
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium">$1</mark>',
    )
  })

  return highlightedText
}

// Export types
export type { SearchOptions, SearchResponse }
