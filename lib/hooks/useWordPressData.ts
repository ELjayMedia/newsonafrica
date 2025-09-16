"use client"

import useSWR from "swr"
import { useState, useCallback } from "react"
import {
  getLatestPostsForCountry,
  getPostsByCategoryForCountry,
  getCategoriesForCountry,
  getRelatedPostsForCountry,
  getFeaturedPosts,
  fetchPost,
} from "@/lib/wordpress-api"

export function useLatestPosts(countryCode: string, limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    [`latest-posts`, countryCode, limit],
    () => getLatestPostsForCountry(countryCode, limit),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes
    },
  )

  return {
    posts: data?.posts || [],
    hasNextPage: data?.hasNextPage || false,
    endCursor: data?.endCursor || null,
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useCategoryPosts(countryCode: string, categorySlug: string, limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    [`category-posts`, countryCode, categorySlug, limit],
    () => getPostsByCategoryForCountry(countryCode, categorySlug, limit),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000,
    },
  )

  return {
    category: data?.category || null,
    posts: data?.posts || [],
    hasNextPage: data?.hasNextPage || false,
    endCursor: data?.endCursor || null,
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useCategories(countryCode: string) {
  const { data, error, isLoading, mutate } = useSWR(
    [`categories`, countryCode],
    () => getCategoriesForCountry(countryCode),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 600000, // 10 minutes - categories change less frequently
    },
  )

  return {
    categories: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function usePost(countryCode: string, slug: string) {
  const { data, error, isLoading, mutate } = useSWR(
    [`post`, countryCode, slug],
    () => fetchPost({ countryCode, slug }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000,
    },
  )

  return {
    post: data || null,
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useRelatedPosts(countryCode: string, postId: string, limit = 6) {
  const { data, error, isLoading, mutate } = useSWR(
    [`related-posts`, countryCode, postId, limit],
    () => getRelatedPostsForCountry(countryCode, postId, limit),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 600000,
    },
  )

  return {
    posts: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useFeaturedPosts(limit = 10) {
  const { data, error, isLoading, mutate } = useSWR([`featured-posts`, limit], () => getFeaturedPosts(limit), {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 300000,
  })

  return {
    posts: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useInfiniteScroll<T>(
  fetcher: (cursor?: string) => Promise<{ items: T[]; hasNextPage: boolean; endCursor: string | null }>,
  key: string[],
) {
  const [items, setItems] = useState<T[]>([])
  const [hasNextPage, setHasNextPage] = useState(true)
  const [endCursor, setEndCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasNextPage) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher(endCursor || undefined)
      setItems((prev) => [...prev, ...result.items])
      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more items"))
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, endCursor, hasNextPage, isLoading])

  const reset = useCallback(() => {
    setItems([])
    setHasNextPage(true)
    setEndCursor(null)
    setError(null)
  }, [])

  return {
    items,
    hasNextPage,
    isLoading,
    error,
    loadMore,
    reset,
  }
}
