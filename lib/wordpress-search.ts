import logger from "@/utils/logger";
const WORDPRESS_REST_API_URL = process.env.WORDPRESS_REST_API_URL || "https://newsonafrica.com/sz/wp-json/wp/v2"

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

// Cache for search results
const searchCache = new Map<string, { data: SearchResponse; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
): Promise<SearchResponse> {
  const startTime = Date.now()

  const { page = 1, perPage = 20, categories = [], tags = [], author, orderBy = "relevance", order = "desc" } = options

  // Create cache key
  const cacheKey = `search:${query}:${JSON.stringify(options)}`

  // Check cache first
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      ...cached.data,
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

    const response = await fetch(`${WORDPRESS_REST_API_URL}/posts?${searchParams}`, {
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
    searchCache.set(cacheKey, {
      data: searchResponse,
      timestamp: Date.now(),
    })

    return searchResponse
  } catch (error) {
    logger.error("WordPress search error:", error)

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
export async function getSearchSuggestions(query: string, limit = 8): Promise<string[]> {
  if (!query || query.length < 2) return []

  try {
    // Search for posts to extract suggestions
    const response = await fetch(
      `${WORDPRESS_REST_API_URL}/posts?search=${encodeURIComponent(query)}&per_page=20&_fields=title,categories,tags&_embed=1`,
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
    logger.error("Error getting search suggestions:", error)
    return []
  }
}

/**
 * Search categories
 */
export async function searchCategories(query: string): Promise<any[]> {
  try {
    const response = await fetch(
      `${WORDPRESS_REST_API_URL}/categories?search=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    logger.error("Error searching categories:", error)
    return []
  }
}

/**
 * Search tags
 */
export async function searchTags(query: string): Promise<any[]> {
  try {
    const response = await fetch(`${WORDPRESS_REST_API_URL}/tags?search=${encodeURIComponent(query)}&per_page=10`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    logger.error("Error searching tags:", error)
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
