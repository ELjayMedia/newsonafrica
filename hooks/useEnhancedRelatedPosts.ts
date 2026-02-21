"use client"

import { useState, useEffect, useCallback } from "react"
import { getRelatedPosts } from "@/lib/wordpress/service"
import type { WordPressPost } from "@/types/wp"

interface RelatedPost extends WordPressPost {
  similarity?: number
  isPopular?: boolean
  readingTime?: number
}

interface UseEnhancedRelatedPostsProps {
  postId: string
  categories?: string[]
  tags?: string[]
  limit?: number
  countryCode?: string
  enableAI?: boolean
  enablePopularityBoost?: boolean
}

interface RelatedPostsState {
  posts: RelatedPost[]
  loading: boolean
  error: string | null
  hasMore: boolean
}

export function useEnhancedRelatedPosts({
  postId,
  categories = [],
  tags = [],
  limit = 6,
  countryCode,
  enableAI = false,
  enablePopularityBoost = true,
}: UseEnhancedRelatedPostsProps) {
  const [state, setState] = useState<RelatedPostsState>({
    posts: [],
    loading: true,
    error: null,
    hasMore: false,
  })

  const calculateSimilarity = useCallback(
    (post: WordPressPost, targetCategories: string[], targetTags: string[]): number => {
      // Basic similarity based on category and tag matching
      let score = 0
      const postCategories = post.categories?.nodes?.map((cat) => cat?.slug || "") || []
      const postTags = post.tags?.nodes?.map((tag) => tag?.slug || "") || []

      // Category similarity (weighted higher)
      const categoryMatches = postCategories.filter((cat): cat is string => Boolean(cat) && targetCategories.includes(cat)).length
      const categoryScore = (categoryMatches / Math.max(targetCategories.length, 1)) * 0.7

      // Tag similarity
      const tagMatches = postTags.filter((tag): tag is string => Boolean(tag) && targetTags.includes(tag)).length
      const tagScore = (tagMatches / Math.max(targetTags.length, 1)) * 0.3

      score = categoryScore + tagScore

      // Boost recent posts slightly
      const postDate = post.date ? new Date(post.date) : null
      const daysSincePublished = postDate ? (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24) : Number.POSITIVE_INFINITY
      const recencyBoost = Math.max(0, (30 - daysSincePublished) / 30) * 0.1

      return Math.min(1, score + recencyBoost)
    },
    [],
  )

  const estimateReadingTime = useCallback((content: string): number => {
    const wordsPerMinute = 200
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length
    return Math.max(1, Math.round(wordCount / wordsPerMinute))
  }, [])

  const detectPopularity = useCallback(
    (post: WordPressPost): boolean => {
      if (!enablePopularityBoost) return false

      // Simple heuristic: posts with comments or recent posts in trending categories
      const hasComments = (post as any).commentCount > 5
      const postTimestamp = post.date ? new Date(post.date).getTime() : Number.NEGATIVE_INFINITY
      const isRecent = Date.now() - postTimestamp < 7 * 24 * 60 * 60 * 1000 // 7 days
      const trendingCategories = ["politics", "business", "sports", "entertainment"]
      const isInTrendingCategory = post.categories?.nodes?.some((cat) =>
        typeof cat.slug === "string" && trendingCategories.includes(cat.slug.toLowerCase()),
      )

      return hasComments || (isRecent && Boolean(isInTrendingCategory))
    },
    [enablePopularityBoost],
  )

  const fetchRelatedPosts = useCallback(async () => {
    if (!postId || (categories.length === 0 && tags.length === 0)) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      // Fetch more posts than needed for better filtering
      const fetchLimit = Math.min(limit * 2, 20)
      let rawPosts = await getRelatedPosts(postId, categories, tags, fetchLimit, countryCode)
      // Remove the original post if it sneaks into the results
      const numericPostId = Number(postId)
      rawPosts = rawPosts.filter((post) => {
        if (!Number.isNaN(numericPostId) && typeof post.databaseId === "number") {
          return post.databaseId !== numericPostId
        }
        return post.id !== postId
      })

      const enhancedPosts: RelatedPost[] = rawPosts.map((post) => ({
        ...post,
        similarity: calculateSimilarity(post, categories, tags),
        isPopular: detectPopularity(post),
        readingTime: post.excerpt ? estimateReadingTime(post.excerpt) : undefined,
      }))

      const sortedPosts = enhancedPosts.sort((a, b) => {
        // Primary sort: basic similarity
        if (a.similarity !== b.similarity) {
          return (b.similarity || 0) - (a.similarity || 0)
        }

        // Secondary sort: popularity boost
        if (enablePopularityBoost) {
          if (a.isPopular && !b.isPopular) return -1
          if (!a.isPopular && b.isPopular) return 1
        }

        // Tertiary sort: recency
        const bTime = b.date ? new Date(b.date).getTime() : 0
        const aTime = a.date ? new Date(a.date).getTime() : 0
        return bTime - aTime
      })

      const finalPosts = sortedPosts.slice(0, limit)

      setState({
        posts: finalPosts,
        loading: false,
        error: null,
        hasMore: rawPosts.length > limit,
      })

      if (finalPosts.length > 0) {
        // Preloading disabled in simplified API
      }
    } catch (err) {
      console.error("Failed to fetch enhanced related posts:", err)
      setState({
        posts: [],
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch related posts",
        hasMore: false,
      })
    }
  }, [
    postId,
    categories,
    tags,
    limit,
    countryCode,
    enablePopularityBoost,
    calculateSimilarity,
    detectPopularity,
    estimateReadingTime,
  ])

  useEffect(() => {
    fetchRelatedPosts()
  }, [fetchRelatedPosts])

  const retry = useCallback(() => {
    fetchRelatedPosts()
  }, [fetchRelatedPosts])

  return {
    ...state,
    retry,
  }
}
