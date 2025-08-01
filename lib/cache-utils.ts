import { revalidatePath } from "next/cache"

// Cache durations in seconds
export const CACHE_DURATIONS = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
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

interface CacheEntry<T> {
  expiry: number
  data: T
}

const fetchCache = new Map<string, CacheEntry<unknown>>()

function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of fetchCache.entries()) {
    if (entry.expiry <= now) {
      fetchCache.delete(key)
    }
  }
}

// Cleanup expired entries periodically
setInterval(cleanupCache, 60_000).unref?.()

// Cached fetch function with revalidation
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheDuration = CACHE_DURATIONS.MEDIUM
): Promise<T> {
  try {
    if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
      throw new Error("Device is offline")
    }

    cleanupCache()

    const cacheKey = JSON.stringify([url, options])
    const now = Date.now()
    const cached = fetchCache.get(cacheKey) as CacheEntry<T> | undefined
    if (cached && cached.expiry > now) {
      return cached.data
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

        const data = await response.json()
        fetchCache.set(cacheKey, { data, expiry: now + cacheDuration * 1000 })
        return data
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

// For testing purposes
export function clearFetchCache() {
  fetchCache.clear()
}

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
export function generateCacheControlHeader(
  maxAge: number,
  staleWhileRevalidate?: number
): string {
  const swrPart = staleWhileRevalidate
    ? `, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    : ""
  return `public, max-age=${maxAge}${swrPart}`
}
