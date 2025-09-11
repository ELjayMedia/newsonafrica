import { LRUCache } from "lru-cache"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class WordPressCacheManager {
  private cache: LRUCache<string, CacheEntry<any>>
  private defaultTTL = 300000 // 5 minutes

  constructor() {
    this.cache = new LRUCache({
      max: 1000, // Maximum number of items
      ttl: this.defaultTTL,
    })
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }
    this.cache.set(key, entry)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Generate cache keys
  generateKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|")
    return `${type}:${sortedParams}`
  }

  // Cache statistics
  getStats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
      max: this.cache.max,
    }
  }
}

export const wordPressCache = new WordPressCacheManager()

export async function getCachedData<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
  // Try to get from cache first
  const cached = wordPressCache.get<T>(key)
  if (cached) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()

  // Cache the result
  wordPressCache.set(key, data, ttl)

  return data
}

export function invalidateCache(pattern: string): void {
  // Simple pattern matching for cache invalidation
  const keys = Array.from(wordPressCache.cache.keys())
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      wordPressCache.delete(key)
    }
  })
}
