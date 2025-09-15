import { cache } from "react"

// Cache durations in seconds
export const CACHE_DURATIONS = {
  NONE: 0, // No cache
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 86400, // 24 hours
} as const

// Cache tags for different content types
export const CACHE_TAGS = {
  HOME: "home",
  POSTS: "posts",
  POST: (id: string | number) => `post-${id}`,
  CATEGORIES: "categories",
  CATEGORY: (id: string | number) => `category-${id}`,
  AUTHORS: "authors",
  TAGS: "tags",
  COMMENTS: "comments",
  FEATURED: "featured",
  TRENDING: "trending",
  BOOKMARKS: "bookmarks",
  USERS: "users",
  SUBSCRIPTIONS: "subscriptions",
} as const

// Cached fetch function with revalidation
export const cachedFetch = cache(
  async <T,>(
    url: string,
    options?: RequestInit,
    cacheDuration = CACHE_DURATIONS.MEDIUM
  ): Promise<T> => {
    try {
      if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
        throw new Error("Device is offline")
      }

      const MAX_RETRIES = 3
      let lastError: unknown

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s

          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            next: { revalidate: cacheDuration },
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
          }

          return await response.json()
        } catch (error) {
          console.error(`Fetch attempt ${attempt + 1} failed for ${url}:`, error)
          lastError = error
          if (attempt === MAX_RETRIES - 1) throw error
          const backoff = Math.min(1000 * 2 ** attempt, 8000)
          await new Promise((resolve) => setTimeout(resolve, backoff))
        }
      }

      throw lastError
    } catch (error) {
      console.error(`Error fetching ${url}:`, error)
      throw error
    }
  }
)

// Function to generate cache control headers
export function generateCacheControlHeader(
  maxAge: number,
  staleWhileRevalidate?: number
): string {
  const swrPart = staleWhileRevalidate
    ? `, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    : ""
  return `public, max-age=${maxAge}${swrPart}`
}
