"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

import ErrorBoundary from "@/components/ErrorBoundary"
import { Button } from "@/components/ui/button"
import { PostList } from "@/components/posts/PostList"
import { mapWordPressPostsToPostListItems } from "@/lib/data/post-list"
import { fetchTaggedPostsAction } from "@/app/actions/content"
import type { FetchTaggedPostsResult, WordPressPost } from "@/types/wp"
import { fetchTaggedPostsPageAction } from "./actions"

interface TagFeedClientProps {
  slug: string
  tag: {
    name: string
    description?: string
  }
  initialData?: FetchTaggedPostsResult | null
  countryCode: string
}

const buildPostKey = (post: WordPressPost): string => {
  if (post.id) return String(post.id)
  if (post.databaseId) return String(post.databaseId)
  if (post.globalRelayId) return String(post.globalRelayId)
  if (post.slug) return post.slug
  return `${post.title ?? "post"}-${post.date ?? "unknown"}`
}

export function TagFeedClient({ slug, tag, initialData, countryCode }: TagFeedClientProps) {
  const [pages, setPages] = useState<FetchTaggedPostsResult[]>(() =>
    initialData ? [initialData] : [],
  )
  const [pageInfo, setPageInfo] = useState<FetchTaggedPostsResult["pageInfo"]>(() =>
    initialData?.pageInfo ?? { hasNextPage: false, endCursor: null },
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const combinedPosts = useMemo(() => {
    const seen = new Set<string>()
    const items: WordPressPost[] = []

    pages.forEach((page) => {
      page?.nodes?.forEach((post) => {
        if (!post) return
        const key = buildPostKey(post)
        if (!seen.has(key)) {
          seen.add(key)
          items.push(post)
        }
      })
    })

    return items
  }, [pages])

  const mappedPosts = useMemo(
    () => mapWordPressPostsToPostListItems(combinedPosts, countryCode),
    [combinedPosts, countryCode],
  )

  const fetchNextPage = useCallback(() => {
    if (isLoading || isPending || !pageInfo?.hasNextPage) {
      return
    }

    setIsLoading(true)
    setError(null)

    startTransition(() => {
      void fetchTaggedPostsPageAction({
        slug,
        after: pageInfo.endCursor ?? null,
        first: 10,
        countryCode,
      })
        .then((data) => {
          if (!data) {
            return
          }

          setPages((previous) => [...previous, data])
          setPageInfo(data.pageInfo ?? { hasNextPage: false, endCursor: null })
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Failed to load more posts"
          setError(message)
        })
        .finally(() => {
          setIsLoading(false)
        })
    })
  }, [countryCode, isLoading, isPending, pageInfo?.endCursor, pageInfo?.hasNextPage, slug, startTransition])

  const { ref, inView } = useIntersectionObserver<HTMLDivElement>({ rootMargin: "200px" })

  useEffect(() => {
    if (inView) {
      void fetchNextPage()
    }
  }, [fetchNextPage, inView])

  const hasMore = pageInfo?.hasNextPage ?? false
  const isFetchingMore = isLoading || isPending

  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Articles tagged with "{tag.name}"</h1>
        {tag.description && <p className="text-gray-600 mb-6">{tag.description}</p>}

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <PostList posts={mappedPosts} />

        <div ref={ref} className="mt-8 text-center">
          {isFetchingMore ? (
            <div className="text-sm text-muted-foreground">Loading more...</div>
          ) : hasMore ? (
            <Button onClick={fetchNextPage}>Load More</Button>
          ) : (
            <div className="text-sm text-muted-foreground">No more articles</div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
