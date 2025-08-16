"use client"

import { useState, useEffect } from "react"
import { getRelatedPosts } from "@/lib/api/wordpress"
import type { WordPressPost } from "@/lib/api/wordpress"
import { cachePreloader } from "@/lib/cache/cache-preloader"

interface UseRelatedPostsProps {
  postId: string
  categories?: string[]
  tags?: string[]
  limit?: number
  countryCode?: string
}

export function useRelatedPosts({
  postId,
  categories = [],
  tags = [],
  limit = 6,
  countryCode,
  enablePreloading = true,
}: UseRelatedPostsProps & { enablePreloading?: boolean }) {
  const [relatedPosts, setRelatedPosts] = useState<WordPressPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      if (!postId || (categories.length === 0 && tags.length === 0)) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const related = await getRelatedPosts(postId, categories, tags, limit, countryCode)
        setRelatedPosts(related)

        // Preload related posts for the fetched posts
        if (enablePreloading && related.length > 0) {
          cachePreloader
            .preloadVisiblePosts(related, {
              batchSize: 3,
              delayBetweenBatches: 50,
              maxConcurrent: 2,
            })
            .catch((err) => {
              console.warn("Failed to preload related posts:", err)
            })
        }
      } catch (err) {
        console.error("Failed to fetch related posts:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch related posts")
        setRelatedPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchRelatedPosts()
  }, [postId, categories.join(","), tags.join(","), limit, countryCode, enablePreloading])

  return { relatedPosts, loading, error }
}
