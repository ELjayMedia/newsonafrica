interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  staleTime: number
  lastAccessed: number
  accessCount: number
}

class EnhancedCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly maxSize = 1000
  private memoryUsage = 0
  private readonly maxMemoryMB = 50

  set<T>(key: string, data: T, ttl = 300000, staleTime = 600000) {
    const estimatedSize = this.estimateSize(data)

    // Clean up old entries if cache is full or memory limit exceeded
    if (this.cache.size >= this.maxSize || this.memoryUsage + estimatedSize > this.maxMemoryMB * 1024 * 1024) {
      this.evictLRU()
    }

    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      staleTime,
      lastAccessed: now,
      accessCount: 1,
    })

    this.memoryUsage += estimatedSize
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
      this.memoryUsage -= this.estimateSize(entry.data)
      return { data: null, isStale: true, exists: false }
    }

    entry.lastAccessed = now
    entry.accessCount++

    const isStale = age > entry.ttl
    return { data: entry.data, isStale, exists: true }
  }

  delete(key: string) {
    const entry = this.cache.get(key)
    if (entry) {
      this.memoryUsage -= this.estimateSize(entry.data)
    }
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
    this.memoryUsage = 0
  }

  size() {
    return this.cache.size
  }

  getMemoryUsage() {
    return {
      used: this.memoryUsage,
      maxMB: this.maxMemoryMB,
      entries: this.cache.size,
    }
  }

  private evictLRU() {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize evicting stale entries first
      const age = Date.now() - entry.timestamp
      if (age > entry.staleTime) {
        this.delete(key)
        return
      }

      // Find least recently used entry
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2 // Rough estimate: 2 bytes per character
    } catch {
      return 1024 // Default 1KB if can't stringify
    }
  }

  getStats() {
    const now = Date.now()
    let freshEntries = 0
    let staleEntries = 0
    let expiredEntries = 0

    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp
      if (age > entry.staleTime) {
        expiredEntries++
      } else if (age > entry.ttl) {
        staleEntries++
      } else {
        freshEntries++
      }
    }

    return {
      total: this.cache.size,
      fresh: freshEntries,
      stale: staleEntries,
      expired: expiredEntries,
      memoryUsage: this.memoryUsage,
      hitRate: this.calculateHitRate(),
    }
  }

  private calculateHitRate(): number {
    let totalAccess = 0
    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount
    }
    return this.cache.size > 0 ? totalAccess / this.cache.size : 0
  }
}

export const enhancedCache = new EnhancedCache()
