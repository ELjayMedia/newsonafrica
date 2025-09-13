import { LRUCache } from "lru-cache"
interface RateLimitOptions {
  interval: number
  uniqueTokenPerInterval: number
}

export function rateLimit({ interval, uniqueTokenPerInterval }: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number>({
    max: uniqueTokenPerInterval,
    ttl: interval,
  })

  return {
    async check(limit: number, token: string) {
      const current = tokenCache.get(token) ?? 0
      if (current + 1 > limit) {
        tokenCache.set(token, current + 1)
        throw new Error("Rate limit exceeded")
      }
      tokenCache.set(token, current + 1)
    },
  }
}
