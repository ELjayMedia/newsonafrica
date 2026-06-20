interface QueryCacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

const queryCache = new Map<string, QueryCacheEntry<unknown>>()

export const DEFAULT_CACHE_TTL = 5 * 60 * 1000

export function clearQueryCache(key?: string, pattern?: RegExp): void {
  if (key) {
    queryCache.delete(key)
    return
  }

  if (pattern) {
    for (const cacheKey of queryCache.keys()) {
      if (pattern.test(cacheKey)) {
        queryCache.delete(cacheKey)
      }
    }
    return
  }

  queryCache.clear()
}

interface ExecuteOptions {
  force?: boolean
  ttl?: number
}

export async function executeWithCache<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  ttl: number = DEFAULT_CACHE_TTL,
  options: ExecuteOptions = {},
): Promise<T> {
  const effectiveTtl = options.ttl ?? ttl
  const shouldBypassCache = options.force || effectiveTtl <= 0
  const now = Date.now()

  if (!shouldBypassCache) {
    const cached = queryCache.get(cacheKey)
    if (cached && now < cached.expiresAt) {
      return cached.data as T
    }
  }

  const result = await fetcher()

  if (!shouldBypassCache) {
    queryCache.set(cacheKey, {
      data: result,
      timestamp: now,
      expiresAt: now + effectiveTtl,
    })
  }

  return result
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of queryCache.entries()) {
    if (entry.expiresAt <= now) {
      queryCache.delete(key)
    }
  }
}, 60_000)
