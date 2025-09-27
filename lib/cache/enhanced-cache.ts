interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  staleTime: number
  lastAccessed: number
  accessCount: number
  priority: number // Higher priority items are kept longer
  source: string // Track where data came from (api, fallback, etc.)
  version: number // For cache invalidation
  compressionRatio?: number // Track compression efficiency
}

interface CacheOptions {
  ttl?: number
  staleTime?: number
  priority?: number
  source?: string
  version?: number
  compress?: boolean
}

interface CacheStats {
  total: number
  fresh: number
  stale: number
  expired: number
  memoryUsage: number
  hitRate: number
  compressionRatio: number
  priorityDistribution: Record<number, number>
  sourceDistribution: Record<string, number>
}

class EnhancedCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly maxSize = 2000 // Increased from 1000 to 2000
  private memoryUsage = 0
  private readonly maxMemoryMB = 100 // Increased from 50MB to 100MB
  private hitCount = 0
  private missCount = 0
  private compressionEnabled = true

  private readonly PRIORITY_LEVELS = {
    CRITICAL: 10, // Homepage data, featured posts
    HIGH: 7, // Category posts, recent articles
    MEDIUM: 5, // Author data, related posts
    LOW: 3, // Search results, comments
    CACHE_ONLY: 1, // Temporary data
  }

  set<T>(key: string, data: T, options: CacheOptions = {}) {
    const {
      ttl = 300000, // 5 minutes
      staleTime = 900000, // 15 minutes
      priority = this.PRIORITY_LEVELS.MEDIUM,
      source = "api",
      version = 1,
      compress = this.compressionEnabled,
    } = options

    let processedData = data
    let compressionRatio = 1

    if (compress && this.shouldCompress(data)) {
      try {
        const compressed = this.compressData(data)
        if (compressed.size < this.estimateSize(data) * 0.7) {
          // Only use if >30% savings
          processedData = compressed.data
          compressionRatio = compressed.ratio
        }
      } catch (error) {
        console.warn("[v0] Cache compression failed:", error)
      }
    }

    const estimatedSize = this.estimateSize(processedData)

    while (
      (this.cache.size >= this.maxSize || this.memoryUsage + estimatedSize > this.maxMemoryMB * 1024 * 1024) &&
      this.cache.size > 0
    ) {
      this.evictSmartly()
    }

    const now = Date.now()
    this.cache.set(key, {
      data: processedData,
      timestamp: now,
      ttl,
      staleTime,
      lastAccessed: now,
      accessCount: 1,
      priority,
      source,
      version,
      compressionRatio,
    })

    this.memoryUsage += estimatedSize
  }

  get<T>(key: string): { data: T | null; isStale: boolean; exists: boolean; source?: string } {
    const entry = this.cache.get(key)
    if (!entry) {
      this.missCount++
      return { data: null, isStale: false, exists: false }
    }

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.staleTime) {
      // Data is too stale, remove it
      this.cache.delete(key)
      this.memoryUsage -= this.estimateSize(entry.data)
      this.missCount++
      return { data: null, isStale: true, exists: false }
    }

    entry.lastAccessed = now
    entry.accessCount++
    this.hitCount++

    let data = entry.data
    if (entry.compressionRatio && entry.compressionRatio < 1) {
      try {
        data = this.decompressData(entry.data)
      } catch (error) {
        console.warn("[v0] Cache decompression failed:", error)
        // Return compressed data as fallback
      }
    }

    const isStale = age > entry.ttl
    return { data, isStale, exists: true, source: entry.source }
  }

  getStaleIfError<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    const age = now - entry.timestamp

    // Return even stale data if it's not completely expired
    if (age <= entry.staleTime) {
      entry.lastAccessed = now
      entry.accessCount++

      let data = entry.data
      if (entry.compressionRatio && entry.compressionRatio < 1) {
        try {
          data = this.decompressData(entry.data)
        } catch (error) {
          console.warn("[v0] Cache decompression failed:", error)
        }
      }

      return data
    }

    return null
  }

  invalidateVersion(version: number) {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.version <= version) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.delete(key))
    console.log(`[v0] Cache: Invalidated ${keysToDelete.length} entries for version ${version}`)
  }

  invalidateSource(source: string) {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.source === source) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.delete(key))
    console.log(`[v0] Cache: Invalidated ${keysToDelete.length} entries from source ${source}`)
  }

  warmCache<T>(key: string, dataProvider: () => Promise<T>, options: CacheOptions = {}) {
    // Only warm if not already cached or if data is stale
    const existing = this.get(key)
    if (existing.exists && !existing.isStale) {
      return Promise.resolve(existing.data)
    }

    return dataProvider()
      .then((data) => {
        this.set(key, data, { ...options, priority: this.PRIORITY_LEVELS.CRITICAL })
        return data
      })
      .catch((error) => {
        console.warn(`[v0] Cache warming failed for ${key}:`, error)
        // Return stale data if available
        return this.getStaleIfError(key)
      })
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
    this.hitCount = 0
    this.missCount = 0
  }

  size() {
    return this.cache.size
  }

  getMemoryUsage() {
    return {
      used: this.memoryUsage,
      maxMB: this.maxMemoryMB,
      entries: this.cache.size,
      utilizationPercent: (this.memoryUsage / (this.maxMemoryMB * 1024 * 1024)) * 100,
    }
  }

  private evictSmartly() {
    const now = Date.now()
    const candidates: Array<{ key: string; entry: CacheEntry<any>; score: number }> = []

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      const timeSinceAccess = now - entry.lastAccessed

      // Calculate eviction score (higher = more likely to evict)
      let score = 0

      // Age factor (older = higher score)
      score += (age / entry.staleTime) * 40

      // Access recency (less recent = higher score)
      score += (timeSinceAccess / (24 * 60 * 60 * 1000)) * 30 // 24 hours max

      // Priority factor (lower priority = higher score)
      score += (10 - entry.priority) * 20

      // Access frequency (less frequent = higher score)
      score += Math.max(0, 10 - entry.accessCount) * 10

      // Expired entries get maximum score
      if (age > entry.staleTime) {
        score = 1000
      }

      candidates.push({ key, entry, score })
    }

    // Sort by score (highest first) and evict the worst candidate
    candidates.sort((a, b) => b.score - a.score)

    if (candidates.length > 0) {
      const toEvict = candidates[0]
      this.delete(toEvict.key)
      console.log(`[v0] Cache: Evicted ${toEvict.key} (score: ${toEvict.score.toFixed(2)})`)
    }
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2 // Rough estimate: 2 bytes per character
    } catch {
      return 1024 // Default 1KB if can't stringify
    }
  }

  private shouldCompress(data: any): boolean {
    const size = this.estimateSize(data)
    return size > 5000 // Only compress data larger than 5KB
  }

  private compressData(data: any): { data: string; ratio: number } {
    const original = JSON.stringify(data)
    const originalSize = original.length

    // Simple compression using JSON + base64 (in real app, use proper compression)
    const compressed = btoa(original)
    const compressedSize = compressed.length

    return {
      data: compressed,
      ratio: compressedSize / originalSize,
    }
  }

  private decompressData(compressedData: string): any {
    const decompressed = atob(compressedData)
    return JSON.parse(decompressed)
  }

  getStats(): CacheStats {
    const now = Date.now()
    let freshEntries = 0
    let staleEntries = 0
    let expiredEntries = 0
    let totalCompressionRatio = 0
    let compressedEntries = 0
    const priorityDistribution: Record<number, number> = {}
    const sourceDistribution: Record<string, number> = {}

    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp

      if (age > entry.staleTime) {
        expiredEntries++
      } else if (age > entry.ttl) {
        staleEntries++
      } else {
        freshEntries++
      }

      // Track compression stats
      if (entry.compressionRatio && entry.compressionRatio < 1) {
        totalCompressionRatio += entry.compressionRatio
        compressedEntries++
      }

      // Track priority distribution
      priorityDistribution[entry.priority] = (priorityDistribution[entry.priority] || 0) + 1

      // Track source distribution
      sourceDistribution[entry.source] = (sourceDistribution[entry.source] || 0) + 1
    }

    const totalRequests = this.hitCount + this.missCount
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0
    const compressionRatio = compressedEntries > 0 ? totalCompressionRatio / compressedEntries : 1

    return {
      total: this.cache.size,
      fresh: freshEntries,
      stale: staleEntries,
      expired: expiredEntries,
      memoryUsage: this.memoryUsage,
      hitRate,
      compressionRatio,
      priorityDistribution,
      sourceDistribution,
    }
  }

  optimize() {
    const stats = this.getStats()

    // Clean up expired entries
    if (stats.expired > 0) {
      const keysToDelete: string[] = []
      const now = Date.now()

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.staleTime) {
          keysToDelete.push(key)
        }
      }

      keysToDelete.forEach((key) => this.delete(key))
      console.log(`[v0] Cache: Cleaned up ${keysToDelete.length} expired entries`)
    }

    // Adjust compression threshold based on memory usage
    const memoryUsage = this.getMemoryUsage()
    if (memoryUsage.utilizationPercent > 80) {
      this.compressionEnabled = true
      console.log("[v0] Cache: Enabled compression due to high memory usage")
    } else if (memoryUsage.utilizationPercent < 40) {
      this.compressionEnabled = false
      console.log("[v0] Cache: Disabled compression due to low memory usage")
    }

    return stats
  }

  getHealth(): { status: "healthy" | "degraded" | "critical"; issues: string[] } {
    const stats = this.getStats()
    const memoryUsage = this.getMemoryUsage()
    const issues: string[] = []

    if (memoryUsage.utilizationPercent > 90) {
      issues.push("High memory usage")
    }

    if (stats.hitRate < 0.5) {
      issues.push("Low hit rate")
    }

    if (stats.expired / stats.total > 0.3) {
      issues.push("High expired entry ratio")
    }

    if (this.cache.size >= this.maxSize * 0.9) {
      issues.push("Cache near capacity")
    }

    let status: "healthy" | "degraded" | "critical" = "healthy"
    if (issues.length > 2) {
      status = "critical"
    } else if (issues.length > 0) {
      status = "degraded"
    }

    return { status, issues }
  }
}

export const enhancedCache = new EnhancedCache()

if (typeof window !== "undefined") {
  // Optimize cache every 5 minutes
  setInterval(
    () => {
      enhancedCache.optimize()
    },
    5 * 60 * 1000,
  )

  // Log cache health every 10 minutes in development
  if (process.env.NODE_ENV === "development") {
    setInterval(
      () => {
        const health = enhancedCache.getHealth()
        const stats = enhancedCache.getStats()
        console.log("[v0] Cache Health:", health)
        console.log("[v0] Cache Stats:", stats)
      },
      10 * 60 * 1000,
    )
  }
}
