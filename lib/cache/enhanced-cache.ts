interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  staleTime: number
}

class EnhancedCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly maxSize = 1000

  set<T>(key: string, data: T, ttl = 300000, staleTime = 600000) {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      staleTime,
    })
  }

  get<T>(key: string): { data: T | null; isStale: boolean; exists: boolean } {
    const entry = this.cache.get(key)
    if (!entry) {
      return { data: null, isStale: false, exists: false }
    }

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.staleTime) {
      // Data is too stale, remove it
      this.cache.delete(key)
      return { data: null, isStale: true, exists: false }
    }

    const isStale = age > entry.ttl
    return { data: entry.data, isStale, exists: true }
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

export const enhancedCache = new EnhancedCache()
