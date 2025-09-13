import logger from '@/utils/logger'
/**
 * WordPress-based search actions
 */

import { siteConfig } from "@/config/site"

export interface SearchResult {
  id: string
  title: string
  excerpt: string
  content: string
  slug: string
  date: string
  categories: string[]
  tags: string[]
  author: string
  featured_media_url?: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

/**
 * Search posts using WordPress REST API
 */
export async function searchPosts(
  query: string,
  options: {
    page?: number
    perPage?: number
    categories?: string[]
    tags?: string[]
    orderBy?: "relevance" | "date" | "title"
    order?: "asc" | "desc"
  } = {},
): Promise<SearchResponse> {
  const { page = 1, perPage = 20, categories = [], tags = [], orderBy = "relevance", order = "desc" } = options

  try {
    const searchParams = new URLSearchParams({
      search: query,
      page: page.toString(),
      per_page: perPage.toString(),
      _embed: "1",
      orderby: orderBy,
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

    const response = await fetch(`${siteConfig.wordpress.apiUrl}/posts?${searchParams}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
    }

    const posts = await response.json()
    const totalPosts = Number.parseInt(response.headers.get("X-WP-Total") || "0", 10)
    const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") || "1", 10)

    const results: SearchResult[] = posts.map((post: any) => ({
      id: post.id.toString(),
      title: post.title.rendered,
      excerpt: post.excerpt.rendered,
      content: post.content.rendered,
      slug: post.slug,
      date: post.date,
      categories: post._embedded?.["wp:term"]?.[0]?.map((cat: any) => cat.name) || [],
      tags: post._embedded?.["wp:term"]?.[1]?.map((tag: any) => tag.name) || [],
      author: post._embedded?.author?.[0]?.name || "Unknown",
      featured_media_url: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
    }))

    return {
      results,
      total: totalPosts,
      page,
      totalPages,
      hasMore: page < totalPages,
    }
  } catch (error) {
    logger.error("WordPress search error:", error)
    return {
      results: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    }
  }
}

/**
 * Get search suggestions from WordPress
 */
export async function getSearchSuggestions(query: string, limit = 8): Promise<string[]> {
  if (!query || query.length < 2) return []

  try {
    const response = await fetch(
      `${siteConfig.wordpress.apiUrl}/posts?search=${encodeURIComponent(query)}&per_page=20&_fields=title,categories,tags&_embed=1`,
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
      `${siteConfig.wordpress.apiUrl}/categories?search=${encodeURIComponent(query)}&per_page=10`,
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
    const response = await fetch(
      `${siteConfig.wordpress.apiUrl}/tags?search=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    logger.error("Error searching tags:", error)
    return []
  }
}

/**
 * Update WordPress search cache
 */
export async function clearSearchCache(): Promise<void> {
  // Clear any local caches if needed
  logger.debug("WordPress search cache cleared")
}
