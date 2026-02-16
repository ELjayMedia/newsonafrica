import "server-only"

// Cache timeout constants
export const CACHE_TIMEOUTS = {
  SHORT: 60, // 1 minute - real-time data
  MEDIUM: 300, // 5 minutes - frequently updated
  LONG: 3600, // 1 hour - stable content
  VERY_LONG: 86400, // 24 hours - rarely changes
} as const

// Cache tag prefixes for systematic invalidation
export const TAG_PREFIX = {
  POST: "post",
  CATEGORY: "category",
  EDITION: "edition",
  USER: "user",
  SEARCH: "search",
} as const

/**
 * Unified cache wrapper with timeout, tags, and fallback support
 * Use this for all server-side caching instead of raw unstable_cache
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    tags?: string[]
    revalidate?: number
    timeout?: number
    fallback?: T
  } = {},
): Promise<T> {
  const {
    tags = [],
    revalidate = CACHE_TIMEOUTS.MEDIUM,
    timeout = 10000, // 10s default timeout
    fallback,
  } = options

  const cacheKey = `cache:${key}`

  try {
    const { unstable_cache } = await import("next/cache")

    // Wrap fetcher with timeout
    const fetchWithTimeout = () =>
      Promise.race([
        fetcher(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Fetch timeout")), timeout)),
      ])

    // Use Next.js cache with tags
    const cachedFn = unstable_cache(fetchWithTimeout, [cacheKey], {
      tags,
      revalidate,
    })

    return await cachedFn()
  } catch (error) {
    console.error(`[v0] Cache fetch failed for ${key}:`, error)

    // Return fallback or rethrow
    if (fallback !== undefined) {
      console.log(`[v0] Using fallback value for ${key}`)
      return fallback
    }

    throw error
  }
}

/**
 * Cache tag builder for systematic invalidation
 */
export function buildTags(type: keyof typeof TAG_PREFIX, ids: string[]): string[] {
  const prefix = TAG_PREFIX[type]
  return ids.map((id) => `${prefix}:${id}`)
}

/**
 * WordPress content cache helper
 */
export async function cacheWordPressContent<T>(
  editionCode: string,
  contentType: "post" | "category" | "page",
  id: string,
  fetcher: () => Promise<T>,
  options: {
    revalidate?: number
    fallback?: T
  } = {},
): Promise<T> {
  const key = `wp:${editionCode}:${contentType}:${id}`
  const tags = [
    ...buildTags("EDITION", [editionCode]),
    ...buildTags(contentType === "post" ? "POST" : "CATEGORY", [id]),
  ]

  return cachedFetch(key, fetcher, {
    tags,
    revalidate: options.revalidate ?? CACHE_TIMEOUTS.LONG,
    fallback: options.fallback,
  })
}
