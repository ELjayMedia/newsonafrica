/**
 * WordPress-based post search utility
 */

import { siteConfig } from "@/config/site"
import type { SearchPost } from "./search"

export interface Post {
  id: string
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
  featured_media?: number
  categories?: number[]
  tags?: number[]
  author?: number
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string
      alt_text?: string
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

/**
 * Search posts using WordPress REST API
 */
export async function searchPosts(query: string, limit = 20): Promise<Post[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const searchParams = new URLSearchParams({
      search: query.trim(),
      per_page: limit.toString(),
      _embed: "1",
      orderby: "relevance",
      order: "desc",
    })

    const response = await fetch(`${siteConfig.wordpress.apiUrl}/posts?${searchParams}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`)
    }

    const posts = await response.json()
    return posts || []
  } catch (error) {
    console.error("WordPress search error:", error)
    // Fallback to local search if API is unavailable
    const localPosts: SearchPost[] = [] // This should be populated with local posts data
    return searchPosts(localPosts, query)
  }
}

/**
 * Filter posts by category
 */
export function filterPostsByCategory(posts: Post[], categoryName: string): Post[] {
  return posts.filter((post) => {
    const categories = post._embedded?.["wp:term"]?.[0] || []
    return categories.some((cat) => cat.name.toLowerCase().includes(categoryName.toLowerCase()))
  })
}

/**
 * Filter posts by tag
 */
export function filterPostsByTag(posts: Post[], tagName: string): Post[] {
  return posts.filter((post) => {
    const tags = post._embedded?.["wp:term"]?.[1] || []
    return tags.some((tag) => tag.name.toLowerCase().includes(tagName.toLowerCase()))
  })
}

/**
 * Sort posts by date
 */
export function sortPostsByDate(posts: Post[], order: "asc" | "desc" = "desc"): Post[] {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return order === "desc" ? dateB - dateA : dateA - dateB
  })
}

/**
 * Get post excerpt without HTML
 */
export function getCleanExcerpt(post: Post, maxLength = 150): string {
  const excerpt = post.excerpt.rendered
  const cleanExcerpt = excerpt.replace(/<[^>]*>/g, "").trim()

  if (cleanExcerpt.length <= maxLength) {
    return cleanExcerpt
  }

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

/**
 * Simple utility function to search posts when the API is unavailable
 */
function searchPostsLocal(posts: SearchPost[], query: string): SearchPost[] {
  if (!query || !posts || posts.length === 0) {
    return []
  }

  const normalizedQuery = query.toLowerCase().trim()
  const terms = normalizedQuery.split(/\s+/).filter((term) => term.length > 1)

  if (terms.length === 0) {
    return []
  }

  return posts.filter((post) => {
    const title = (post.title?.rendered || "").toLowerCase()
    const excerpt = (post.excerpt?.rendered || "").toLowerCase()
    const content = (post.content?.rendered || "").toLowerCase()

    // Check if any term is in the title, excerpt, or content
    return terms.some((term) => title.includes(term) || excerpt.includes(term) || content.includes(term))
  })
}
