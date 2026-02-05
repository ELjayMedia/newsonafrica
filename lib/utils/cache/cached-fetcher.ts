import "server-only"

let _unstable_cache: typeof import("next/cache").unstable_cache | null = null

/**
 * Lazily imports and caches the unstable_cache function from next/cache
 */
export async function getUnstableCache() {
  if (!_unstable_cache) {
    const nextCache = await import("next/cache")
    _unstable_cache = nextCache.unstable_cache
  }
  return _unstable_cache
}

export interface CachedFetcherOptions {
  revalidate: number
  tags?: string[]
}

/**
 * Creates a cached version of an async fetcher function using Next.js unstable_cache.
 * Handles lazy initialization of the cache and provides fallback behavior on error.
 */
export function createCachedFetcher<T>(
  keyParts: string[],
  fn: (baseUrl: string) => Promise<T>,
  options: CachedFetcherOptions,
): (baseUrl: string) => Promise<T> {
  let cachedFn: ((baseUrl: string) => Promise<T>) | null = null
  let cacheInitPromise: Promise<void> | null = null

  const initCache = async () => {
    if (cacheInitPromise) return cacheInitPromise
    cacheInitPromise = (async () => {
      try {
        const unstableCache = await getUnstableCache()
        cachedFn = unstableCache(fn, keyParts, {
          revalidate: options.revalidate,
          tags: options.tags ?? [],
        })
      } catch {
        cachedFn = fn
      }
    })()
    return cacheInitPromise
  }

  return async (baseUrl: string) => {
    await initCache()

    if (!cachedFn) {
      return fn(baseUrl)
    }

    try {
      return await cachedFn(baseUrl)
    } catch (error) {
      return fn(baseUrl)
    }
  }
}
