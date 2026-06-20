interface RateLimitOptions {
  interval: number
  uniqueTokenPerInterval: number
}

export function rateLimit({ interval, uniqueTokenPerInterval }: RateLimitOptions) {
  type CacheEntry = { count: number; expiresAt: number }
  const tokenCache = new Map<string, CacheEntry>()

  const pruneExpired = () => {
    const now = Date.now()
    for (const [key, entry] of tokenCache.entries()) {
      if (entry.expiresAt <= now) {
        tokenCache.delete(key)
      }
    }
  }

  const evictOldestIfNeeded = () => {
    if (tokenCache.size < uniqueTokenPerInterval) {
      return
    }

    let oldestKey: string | undefined
    let oldestExpiration = Number.POSITIVE_INFINITY

    for (const [key, entry] of tokenCache.entries()) {
      if (entry.expiresAt < oldestExpiration) {
        oldestExpiration = entry.expiresAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      tokenCache.delete(oldestKey)
    }
  }

  return {
    async check(limit: number, token: string) {
      pruneExpired()

      const existing = tokenCache.get(token)
      const current = existing?.count ?? 0

      if (!existing) {
        evictOldestIfNeeded()
      }

      const updatedEntry: CacheEntry = {
        count: current + 1,
        expiresAt: Date.now() + interval,
      }

      tokenCache.set(token, updatedEntry)

      if (updatedEntry.count > limit) {
        throw new Error("Rate limit exceeded")
      }
    },
  }
}
