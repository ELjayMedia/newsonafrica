"use client"

import { useCallback, useEffect, useMemo } from "react"

import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import { generateBlurDataURL } from "@/lib/utils/lazy-load"

import {
  AuthorNewsList,
  RegularCategorySection,
  SportCategorySection,
  type NewsGridPost,
} from "../news-grid/NewsGridSections"

interface NewsGridClientProps {
  posts: NewsGridPost[]
  layout?: "vertical" | "horizontal" | "mixed"
  className?: string
  sportCategoryPosts?: NewsGridPost[]
  showSportCategory?: boolean
  isAuthorPage?: boolean
  onLoadMore?: () => Promise<void> | void
  hasMorePosts?: boolean
}

export function NewsGridClient({
  posts,
  className = "",
  sportCategoryPosts = [],
  showSportCategory = false,
  isAuthorPage = false,
  onLoadMore,
  hasMorePosts = false,
}: NewsGridClientProps) {
  const handleLoadMore = useCallback(async () => {
    if (!isAuthorPage || !onLoadMore) return

    await onLoadMore()
  }, [isAuthorPage, onLoadMore])

  const { isFetching, setIsFetching, loadMoreRef } = useInfiniteScroll(handleLoadMore, {
    disabled: !isAuthorPage || !onLoadMore || !hasMorePosts,
  })

  useEffect(() => {
    if (!hasMorePosts) {
      setIsFetching(false)
    }
  }, [hasMorePosts, setIsFetching])

  const blurPlaceholders = useMemo(() => {
    const safeLength = Math.max(posts?.length ?? 0, sportCategoryPosts?.length ?? 0, 1)

    return {
      main: generateBlurDataURL(400, 300),
      secondary: Array.from({ length: safeLength }, () => generateBlurDataURL(70, 70)),
    }
  }, [posts?.length, sportCategoryPosts?.length])

  const hasPosts = posts?.length > 0
  const hasSportCategoryPosts = sportCategoryPosts?.length > 0

  if (!hasPosts && (!showSportCategory || !hasSportCategoryPosts)) {
    return null
  }

  if (isAuthorPage) {
    return (
      <div className={className}>
        <AuthorNewsList posts={posts} blurPlaceholder={blurPlaceholders.main} className="space-y-3" />
        <div ref={loadMoreRef} aria-hidden="true" />
        {isFetching && (
          <div className="py-3 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
            Loading more articles…
          </div>
        )}
        {!isFetching && !hasMorePosts && posts.length > 0 && (
          <div className="py-3 text-center text-gray-500">No more articles to load</div>
        )}
      </div>
    )
  }

  const mainPost = posts?.[0]
  const secondaryPosts = posts?.slice(1, 4) ?? []

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 ${className}`.trim()}>
      {showSportCategory && hasSportCategoryPosts ? (
        <SportCategorySection sportCategoryPosts={sportCategoryPosts} blurURLs={blurPlaceholders} />
      ) : (
        <RegularCategorySection
          mainPost={mainPost}
          secondaryPosts={secondaryPosts}
          blurURLs={blurPlaceholders}
        />
      )}
    </div>
  )
}

export type { NewsGridPost }
