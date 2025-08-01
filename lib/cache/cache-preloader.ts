import { getRelatedPosts } from "@/lib/api/wordpress"
import { relatedPostsCache } from "./related-posts-cache"
import type { WordPressPost } from "@/lib/api/wordpress"

interface PreloadConfig {
  batchSize?: number
  delayBetweenBatches?: number
  maxConcurrent?: number
}

export class CachePreloader {
  private isPreloading = false
  private preloadQueue: Array<{
    postId: string
    categories: string[]
    tags: string[]
    limit: number
    countryCode?: string
    resolve: () => void
  }> = []
  private activeCount = 0
  private maxConcurrent = 3

  /**
   * Preload related posts for a single post
   */
  async preloadPost(
    postId: string,
    categories: string[],
    tags: string[],
    limit = 6,
    countryCode?: string,
  ): Promise<void> {
    try {
      // Check if already cached
      const cached = relatedPostsCache.get(postId, categories, tags, limit, countryCode)
      if (cached) return

      // Fetch and cache
      await getRelatedPosts(postId, categories, tags, limit, countryCode)
    } catch (error) {
      console.warn(`Failed to preload related posts for ${postId}:`, error)
    }
  }

  /**
   * Enqueue a single preload job
   */
  private enqueue(post: {
    id: string
    categories: string[]
    tags: string[]
    limit?: number
    countryCode?: string
  }): Promise<void> {
    return new Promise((resolve) => {
      this.preloadQueue.push({
        postId: post.id,
        categories: post.categories,
        tags: post.tags,
        limit: post.limit ?? 6,
        countryCode: post.countryCode,
        resolve,
      })
      this.isPreloading = true
      this.processQueue()
    })
  }

  /**
   * Process items in the queue respecting concurrency limits
   */
  private processQueue(): void {
    while (this.activeCount < this.maxConcurrent && this.preloadQueue.length > 0) {
      const item = this.preloadQueue.shift()!
      this.activeCount++
      this.preloadPost(item.postId, item.categories, item.tags, item.limit, item.countryCode)
        .catch(() => {})
        .finally(() => {
          this.activeCount--
          item.resolve()
          if (this.preloadQueue.length === 0 && this.activeCount === 0) {
            this.isPreloading = false
          } else {
            this.processQueue()
          }
        })
    }
  }

  /**
   * Preload related posts for multiple posts
   */
  async preloadPosts(
    posts: Array<{
      id: string
      categories: string[]
      tags: string[]
      limit?: number
      countryCode?: string
    }>,
    config: PreloadConfig = {},
  ): Promise<void> {
    const { maxConcurrent = 3 } = config

    this.maxConcurrent = maxConcurrent

    const promises = posts.map((post) => this.enqueue(post))

    await Promise.all(promises)
  }

  /**
   * Preload related posts for posts currently visible on the page
   */
  async preloadVisiblePosts(posts: WordPressPost[], config?: PreloadConfig): Promise<void> {
    const preloadData = posts.map((post) => ({
      id: post.id,
      categories: post.categories.nodes.map((cat) => cat.id),
      tags: post.tags.nodes.map((tag) => tag.id),
    }))

    await this.preloadPosts(preloadData, config)
  }

  /**
   * Smart preloading based on user behavior patterns
   */
  async smartPreload(
    currentPost: WordPressPost,
    recentlyViewedPosts: WordPressPost[] = [],
    config?: PreloadConfig,
  ): Promise<void> {
    const postsToPreload: Array<{
      id: string
      categories: string[]
      tags: string[]
      priority: number
    }> = []

    // High priority: Current post's related posts
    postsToPreload.push({
      id: currentPost.id,
      categories: currentPost.categories.nodes.map((cat) => cat.id),
      tags: currentPost.tags.nodes.map((tag) => tag.id),
      priority: 1,
    })

    // Medium priority: Recently viewed posts
    recentlyViewedPosts.forEach((post) => {
      postsToPreload.push({
        id: post.id,
        categories: post.categories.nodes.map((cat) => cat.id),
        tags: post.tags.nodes.map((tag) => tag.id),
        priority: 2,
      })
    })

    // Sort by priority and preload
    const sortedPosts = postsToPreload.sort((a, b) => a.priority - b.priority).map(({ priority, ...post }) => post)

    await this.preloadPosts(sortedPosts, config)
  }

  /**
   * Check if preloading is currently in progress
   */
  isPreloadingActive(): boolean {
    return this.isPreloading
  }

  /**
   * Get the current preload queue size
   */
  getQueueSize(): number {
    return this.preloadQueue.length
  }
}

// Export singleton instance
export const cachePreloader = new CachePreloader()
