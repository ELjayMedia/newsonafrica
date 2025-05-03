import { cache } from "react"
import { revalidatePath } from "next/cache"

// Cache durations in seconds
export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 86400, // 24 hours
}

// Cache tags for different content types
export const CACHE_TAGS = {
  HOME: "home",
  POSTS: "posts",
  CATEGORIES: "categories",
  AUTHORS: "authors",
  TAGS: "tags",
  COMMENTS: "comments",
}

// Cached fetch function with revalidation
export const cachedFetch = cache(async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  cacheDuration = CACHE_DURATIONS.MEDIUM,
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      next: {
        revalidate: cacheDuration,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    throw error
  }
})

// Function to revalidate multiple paths at once
export async function revalidateMultiplePaths(paths: string[]): Promise<void> {
  paths.forEach((path) => {
    try {
      revalidatePath(path)
    } catch (error) {
      console.error(`Error revalidating path ${path}:`, error)
    }
  })
}

// Function to generate cache control headers
export function generateCacheControlHeader(maxAge: number, staleWhileRevalidate?: number): string {
  return `public, max-age=${maxAge}${
    staleWhileRevalidate ? `, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}` : ""
  }`
}
