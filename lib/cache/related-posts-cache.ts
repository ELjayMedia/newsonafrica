import logger from "@/utils/logger";
import type { WordPressPost } from "@/lib/api/wordpress"

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
  lastAccessed: number
  size: number // Approximate size in bytes for memory management
}

interface CacheStats {
  hits: number
  misses: number
  evictions: number
  totalSize: number
  entryCount: number
}

class RelatedPostsCache {
  private cache = new Map<string, CacheEntry<WordPressPost[]>>()
  private readonly maxSize: number
  private readonly maxEntries: number
  private readonly ttl: number
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
  }

  constructor(
    options: {
      maxSize?: number // Max cache size in bytes (default: 10MB)
      maxEntries?: number // Max number of entries (default: 500)
      ttl?: number // Time to live in milliseconds (default: 15 minutes)
    } = {},
  ) {
    this.maxSize = options.maxSize || 10 * 1024 * 1024 // 10MB
    this.maxEntries = options.maxEntries || 500
    this.ttl = options.ttl || 15 * 60 * 1000 // 15 minutes
  }

  /**
   * Generate a cache key from parameters
   */
  private generateKey(
    postId: string,
    categories: string[],
    tags: string[],
    limit: number,
    countryCode?: string,
  ): string {
    const sortedCategories = [...categories].sort().join(",")
    const sortedTags = [...tags].sort().join(",")
    return `related:${postId}:${sortedCategories}:${sortedTags}:${limit}:${countryCode || "sz"}`
  }

  /**
   * Estimate the size of a cache entry in bytes
   */
  private estimateSize(posts: WordPressPost[]): number {
    // Rough estimation: each post object is approximately 2KB
    return posts.length * 2048 + 200 // 200 bytes for metadata
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<WordPressPost[]>): boolean {
    return Date.now() - entry.timestamp > this.ttl
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
        this.stats.totalSize -= entry.size
      }
    }

    expiredKeys.forEach((key) => {
      this.cache.delete(key)
      this.stats.evictions++
    })

    this.stats.entryCount = this.cache.size
  }

  /**
   * Evict least recently used entries to make space
   */
  private evictLRU(targetSize: number): void {
    if (this.cache.size === 0) return

    // Sort entries by last accessed time and hit count (LRU + LFU hybrid)
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const aScore = a[1].lastAccessed + a[1].hits * 1000 // Boost frequently used items
      const bScore = b[1].lastAccessed + b[1].hits * 1000
      return aScore - bScore
    })

    let freedSize = 0
    const keysToRemove: string[] = []

    for (const [key, entry] of entries) {
      if (this.stats.totalSize - freedSize <= targetSize && this.cache.size - keysToRemove.length <= this.maxEntries) {
        break
      }
      keysToRemove.push(key)
      freedSize += entry.size
      this.stats.evictions++
    }

    keysToRemove.forEach((key) => {
      const entry = this.cache.get(key)
      if (entry) {
        this.stats.totalSize -= entry.size
        this.cache.delete(key)
      }
    })

    this.stats.entryCount = this.cache.size
  }

  /**
   * Ensure cache doesn't exceed limits
   */
  private enforceLimit(): void {
    // First remove expired entries
    this.cleanupExpired()

    // Then check if we need to evict more entries
    if (this.stats.totalSize > this.maxSize || this.cache.size > this.maxEntries) {
      const targetSize = Math.floor(this.maxSize * 0.8) // Target 80% of max size
      this.evictLRU(targetSize)
    }
  }

  /**
   * Get cached related posts
   */
  get(
    postId: string,
    categories: string[],
    tags: string[],
    limit: number,
    countryCode?: string,
  ): WordPressPost[] | null {
    const key = this.generateKey(postId, categories, tags, limit, countryCode)
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.stats.totalSize -= entry.size
      this.stats.entryCount--
      this.stats.misses++
      return null
    }

    // Update access statistics
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++

    return entry.data
  }

  /**
   * Set cached related posts
   */
  set(
    postId: string,
    categories: string[],
    tags: string[],
    limit: number,
    posts: WordPressPost[],
    countryCode?: string,
  ): void {
    const key = this.generateKey(postId, categories, tags, limit, countryCode)
    const size = this.estimateSize(posts)
    const now = Date.now()

    const entry: CacheEntry<WordPressPost[]> = {
      data: posts,
      timestamp: now,
      hits: 0,
      lastAccessed: now,
      size,
    }

    // Remove existing entry if it exists
    const existingEntry = this.cache.get(key)
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size
    } else {
      this.stats.entryCount++
    }

    this.cache.set(key, entry)
    this.stats.totalSize += size

    // Enforce cache limits
    this.enforceLimit()
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; avgEntrySize: number } {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0
    const avgEntrySize = this.stats.entryCount > 0 ? this.stats.totalSize / this.stats.entryCount : 0

    return {
      ...this.stats,
      hitRate,
      avgEntrySize,
    }
  }

  /**
   * Remove entries for a specific post (useful for cache invalidation)
   */
  invalidatePost(postId: string): void {
    const keysToRemove: string[] = []

    for (const key of this.cache.keys()) {
      if (key.includes(`related:${postId}:`)) {
        const entry = this.cache.get(key)
        if (entry) {
          this.stats.totalSize -= entry.size
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach((key) => this.cache.delete(key))
    this.stats.entryCount = this.cache.size
  }

  /**
   * Remove entries for a specific category (useful when category content changes)
   */
  invalidateCategory(categorySlug: string): void {
    const keysToRemove: string[] = []

    for (const key of this.cache.keys()) {
      if (key.includes(categorySlug)) {
        const entry = this.cache.get(key)
        if (entry) {
          this.stats.totalSize -= entry.size
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach((key) => this.cache.delete(key))
    this.stats.entryCount = this.cache.size
  }

  /**
   * Preload related posts for a list of posts (useful for prefetching)
   */
  async preload(
    posts: Array<{
      id: string
      categories: string[]
      tags: string[]
    }>,
    fetchFunction: (postId: string, categories: string[], tags: string[], limit: number) => Promise<WordPressPost[]>,
    limit = 6,
  ): Promise<void> {
    const promises = posts.map(async (post) => {
      const key = this.generateKey(post.id, post.categories, post.tags, limit)
      if (!this.cache.has(key)) {
        try {
          const relatedPosts = await fetchFunction(post.id, post.categories, post.tags, limit)
          this.set(post.id, post.categories, post.tags, limit, relatedPosts)
        } catch (error) {
          logger.warn(`Failed to preload related posts for ${post.id}:`, error)
        }
      }
    })

    await Promise.allSettled(promises)
  }
}

// Create singleton instance
export const relatedPostsCache = new RelatedPostsCache({
  maxSize: 15 * 1024 * 1024, // 15MB
  maxEntries: 750,
  ttl: 20 * 60 * 1000, // 20 minutes
})

// Export for testing and advanced usage
export { RelatedPostsCache }
export type { CacheStats }
