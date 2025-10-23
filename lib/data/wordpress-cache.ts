interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class WordPressCacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 300000 // 5 minutes
  private maxEntries = 1000

  set<T>(key: string, data: T, ttl?: number): void {
    this.pruneExpired()
    this.ensureCapacity()

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

  keys(): string[] {
    this.pruneExpired()
    return Array.from(this.cache.keys())
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
    this.pruneExpired()
    return {
      size: this.cache.size,
      calculatedSize: this.cache.size,
      max: this.maxEntries,
    }
  }

  private pruneExpired() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private ensureCapacity() {
    if (this.cache.size < this.maxEntries) {
      return
    }

    let oldestKey: string | undefined
    let oldestTimestamp = Number.POSITIVE_INFINITY

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
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
  wordPressCache.keys().forEach((key) => {
    if (key.includes(pattern)) {
      wordPressCache.delete(key)
    }
  })
}
