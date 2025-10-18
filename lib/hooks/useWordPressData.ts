"use client"

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"

import { isOnline } from "@/utils/network-utils"

const API_BASE = "/api/wordpress"

function createKey(resource: string, params: Record<string, string | number | undefined>) {
  return [resource, params] as const
}

function serializeQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }
    search.set(key, String(value))
  })

  const query = search.toString()
  return query ? `?${query}` : ""
}

async function fetchJson<T>(resource: string, params: Record<string, string | number | undefined>): Promise<T> {
  const query = serializeQuery(params)
  const response = await fetch(`${API_BASE}/${resource}${query}`, {
    headers: { "content-type": "application/json" },
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch ${resource}: ${response.status} ${text}`)
  }

  return (await response.json()) as T
}

export function useLatestPosts(countryCode: string, limit = 20) {
  const params = useMemo(() => ({ country: countryCode, limit }), [countryCode, limit])
  const { data, error, isLoading, mutate } = useSWR(
    createKey("latest-posts", params),
    () => fetchJson("latest-posts", params),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      refreshInterval: () => (isOnline() ? 60000 : 0),
      dedupingInterval: 300000,
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
  const params = useMemo(
    () => ({ country: countryCode, category: categorySlug, limit }),
    [countryCode, categorySlug, limit],
  )

  const { data, error, isLoading, mutate } = useSWR(
    createKey("category-posts", params),
    () => fetchJson("category-posts", params),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      refreshInterval: () => (isOnline() ? 60000 : 0),
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
  const params = useMemo(() => ({ country: countryCode }), [countryCode])
  const { data, error, isLoading, mutate } = useSWR(
    createKey("categories", params),
    () => fetchJson("categories", params),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      refreshInterval: () => (isOnline() ? 120000 : 0),
      dedupingInterval: 600000,
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
  const params = useMemo(() => ({ country: countryCode, slug }), [countryCode, slug])
  const { data, error, isLoading, mutate } = useSWR(
    createKey("post", params),
    () => fetchJson("post", params),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      refreshInterval: () => (isOnline() ? 60000 : 0),
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
  const params = useMemo(() => ({ country: countryCode, postId, limit }), [countryCode, postId, limit])
  const { data, error, isLoading, mutate } = useSWR(
    createKey("related-posts", params),
    () => fetchJson("related-posts", params),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      refreshInterval: () => (isOnline() ? 120000 : 0),
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
  const params = useMemo(() => ({ limit }), [limit])
  const { data, error, isLoading, mutate } = useSWR(
    createKey("featured-posts", params),
    () => fetchJson("featured-posts", params),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      refreshInterval: () => (isOnline() ? 60000 : 0),
      dedupingInterval: 300000,
    },
  )

  return {
    posts: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useInfiniteScroll<T>(
  fetcher: (cursor?: string) => Promise<{ items: T[]; hasNextPage: boolean; endCursor: string | null }>,
  _key: string[],
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
