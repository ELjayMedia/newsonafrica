import { getRelatedPosts } from "@/lib/api/wordpress"
import { relatedPostsCache } from "./related-posts-cache"
import type { WordPressPost } from "@/lib/api/wordpress"

interface PreloadConfig {
  batchSize?: number
  delayBetweenBatches?: number
  maxConcurrent?: number
}

class CachePreloader {
  private isPreloading = false
  private preloadQueue: Array<{
    postId: string
    categories: string[]
    tags: string[]
    limit: number
    countryCode?: string
  }> = []

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
   * Preload related posts for multiple posts in batches
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
    const { batchSize = 5, delayBetweenBatches = 100, maxConcurrent = 3 } = config

    if (this.isPreloading) {
      console.warn("Preloading already in progress")
      return
    }

    this.isPreloading = true

    try {
      // Process posts in batches
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize)

        // Process batch with limited concurrency
        const semaphore = new Array(maxConcurrent).fill(null)
        const promises = batch.map(async (post, index) => {
          // Wait for semaphore slot
          await semaphore[index % maxConcurrent]

          return this.preloadPost(post.id, post.categories, post.tags, post.limit || 6, post.countryCode)
        })

        await Promise.allSettled(promises)

        // Delay between batches to avoid overwhelming the server
        if (i + batchSize < posts.length && delayBetweenBatches > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
        }
      }
    } finally {
      this.isPreloading = false
    }
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
