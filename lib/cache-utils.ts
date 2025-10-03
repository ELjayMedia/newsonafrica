import { cache } from "react"
import { CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache/constants"
import { fetchWithTimeout } from "./utils/fetchWithTimeout"
import type { NextFetchRequestConfig } from "next/server"

export { CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache/constants"

// Cached fetch function with revalidation
type CachedFetchOptions = RequestInit & {
  timeout?: number
  next?: NextFetchRequestConfig
}

export const cachedFetch = cache(
  async <T,>(
    url: string,
    options?: CachedFetchOptions,
    cacheDuration = CACHE_DURATIONS.MEDIUM,
    tags?: string[],
  ): Promise<T> => {
    try {
      if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
        throw new Error("Device is offline")
      }

      const MAX_RETRIES = 3
      let lastError: unknown

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const { timeout = 10000, next, ...restOptions } = options ?? {}
          const nextOptions: NextFetchRequestConfig = {
            revalidate: cacheDuration,
            ...(next ?? {}),
            ...(tags && tags.length > 0 ? { tags } : {}),
          }

          const response = await fetchWithTimeout(url, {
            ...restOptions,
            next: nextOptions,
            timeout,
          })

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
