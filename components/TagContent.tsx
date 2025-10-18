"use client"

import useSWRInfinite from "swr/infinite"
import { useInView } from "react-intersection-observer"
import { useEffect, useCallback } from "react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import ErrorBoundary from "@/components/ErrorBoundary"
import { fetchTaggedPosts } from "@/lib/wp-server/tags"
import type { FetchTaggedPostsResult } from "@/types/wp"
import { getCurrentCountry } from "@/lib/utils/routing"
import { PostList } from "@/components/posts/PostList"
import { mapWpPostsToPostListItems } from "@/lib/mapping/post-mappers"

interface TagContentProps {
  slug: string
  initialData?: FetchTaggedPostsResult | null
  tag: {
    name: string
    description?: string
  }
}

export function TagContent({ slug, initialData, tag }: TagContentProps) {
  const { ref, inView } = useInView()
  const country = getCurrentCountry()

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite(
    (index, previousPage) => {
      if (previousPage && previousPage.pageInfo && !previousPage.pageInfo.hasNextPage) return null
      const cursor = index === 0 ? null : previousPage?.pageInfo?.endCursor ?? null
      return ["tagPosts", slug, cursor, country]
    },
    ([_, currentSlug, cursor, countryCode]) =>
      fetchTaggedPosts({ slug: currentSlug, after: cursor, countryCode, first: 10 }),
    {
      revalidateOnFocus: false,
      fallbackData: initialData ? [initialData] : undefined,
    },
  )

  const fetchNextPage = useCallback(() => setSize(size + 1), [size, setSize])
  const hasNextPage = data?.[data.length - 1]?.pageInfo.hasNextPage
  const isFetchingNextPage = isValidating && size > (data?.length || 0)

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {(error as Error).message}</div>

  const posts = useMemo(() => data?.flatMap((page) => page.nodes ?? []) || [], [data])
  const mappedPosts = useMemo(() => mapWpPostsToPostListItems(posts, country), [posts, country])

  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Articles tagged with "{tag.name}"</h1>
        {tag.description && <p className="text-gray-600 mb-6">{tag.description}</p>}
        <PostList posts={mappedPosts} />
        <div ref={ref} className="mt-8 text-center">
          {isFetchingNextPage ? (
            <div>Loading more...</div>
          ) : hasNextPage ? (
            <Button onClick={fetchNextPage} disabled={isFetchingNextPage}>
              Load More
            </Button>
          ) : (
            <div>No more articles</div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
