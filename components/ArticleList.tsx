"use client"

import { useState, useEffect, useCallback } from "react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { ArticleCard } from "./ArticleCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Article } from "@/types/article"
import type { WordPressPost } from "@/types/wp"

type ArticleCardLayout = "compact" | "standard" | "featured"

type ArticleItem = Article | WordPressPost

interface BaseArticleListProps {
  layout?: ArticleCardLayout
  className?: string
  emptyMessage?: string
  errorMessage?: string
}

interface InfiniteFetcherResult {
  posts?: ArticleItem[]
  items?: ArticleItem[]
  hasNextPage?: boolean
  endCursor?: string | null
}

interface InfiniteArticleListProps extends BaseArticleListProps {
  fetcher: (cursor?: string | null) => Promise<InfiniteFetcherResult>
  initialData?: InfiniteFetcherResult | null
}

interface StaticArticleListProps extends BaseArticleListProps {
  articles: ArticleItem[]
  showLoadMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
}

type ArticleListProps = InfiniteArticleListProps | StaticArticleListProps

function isInfiniteProps(props: ArticleListProps): props is InfiniteArticleListProps {
  return typeof (props as InfiniteArticleListProps).fetcher === "function"
}

function ArticleCardSkeleton({ layout = "standard" }: { layout?: ArticleCardLayout }) {
  if (layout === "compact") {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex gap-4">
          <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    )
  }

  if (layout === "featured") {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Skeleton className="aspect-[16/9] w-full" />
        <div className="p-6 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

const extractArticles = (data?: InfiniteFetcherResult | null): ArticleItem[] => {
  if (!data) {
    console.log("[v0] No data to extract articles from")
    return []
  }

  if (Array.isArray(data)) {
    console.log("[v0] Extracted", data.length, "articles from array")
    return data as ArticleItem[]
  }

  if (data.posts && Array.isArray(data.posts)) {
    console.log("[v0] Extracted", data.posts.length, "articles from posts")
    return data.posts
  }

  if (data.items && Array.isArray(data.items)) {
    console.log("[v0] Extracted", data.items.length, "articles from items")
    return data.items
  }

  console.log("[v0] No articles found in data structure")
  return []
}

function InfiniteArticleList({
  fetcher,
  initialData,
  layout = "standard",
  className,
  emptyMessage = "No articles found.",
  errorMessage = "Failed to load articles. Please try again.",
}: InfiniteArticleListProps) {
  const [articles, setArticles] = useState<ArticleItem[]>(() => extractArticles(initialData))
  const [hasMore, setHasMore] = useState(initialData?.hasNextPage ?? true)
  const [endCursor, setEndCursor] = useState<string | null>(initialData?.endCursor ?? null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)

  const { ref: loadMoreRef, inView } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0,
    rootMargin: "200px 0px",
  })

  useEffect(() => {
    if (initialData) {
      const extracted = extractArticles(initialData)
      console.log("[v0] Setting initial articles:", extracted.length)
      setArticles(extracted)
      setHasMore(initialData.hasNextPage ?? false)
      setEndCursor(initialData.endCursor ?? null)
      setIsLoading(false)
    } else {
      setArticles([])
      setHasMore(true)
      setEndCursor(null)
    }
  }, [initialData])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return
    }

    console.log("[v0] Loading more articles, cursor:", endCursor)
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher(endCursor ?? undefined)
      const nextArticles = extractArticles(result)
      console.log("[v0] Loaded", nextArticles.length, "more articles")

      if (nextArticles.length > 0) {
        setArticles((prev) => [...prev, ...nextArticles])
      }
      setHasMore(result.hasNextPage ?? false)
      setEndCursor(result.endCursor ?? null)
    } catch (err) {
      console.error("[v0] Error loading more articles:", err)
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, endCursor, hasMore, isLoading, errorMessage])

  useEffect(() => {
    if (articles.length === 0 && hasMore && !isLoading && !error && endCursor) {
      console.log("[v0] No articles yet, loading initial batch")
      loadMore()
    }
  }, [articles.length, hasMore, isLoading, error, endCursor, loadMore])

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      console.log("[v0] Scroll triggered, loading more")
      loadMore()
    }
  }, [inView, hasMore, isLoading, loadMore])

  const handleRetry = () => {
    if (!isLoading) {
      console.log("[v0] Retrying article load")
      loadMore()
    }
  }

  if (error && articles.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline" className="w-full bg-transparent">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (isLoading && articles.length === 0) {
    return (
      <div className={cn("grid gap-6", className)}>
        {Array.from({ length: 6 }).map((_, index) => (
          <ArticleCardSkeleton key={index} layout={layout} />
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className={cn("grid gap-6", className)}>
        {articles.map((article, index) => (
          <ArticleCard key={`${article.id}-${index}`} article={article} layout={layout} priority={index < 3} />
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading more articles...
            </div>
          ) : (
            <Button variant="outline" onClick={loadMore} className="bg-transparent">
              Load more articles
            </Button>
          )}
        </div>
      )}

      {!hasMore && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>You've reached the end of the articles.</p>
        </div>
      )}
    </div>
  )
}

function StaticArticleList({
  articles,
  layout = "standard",
  className,
  showLoadMore = false,
  onLoadMore,
  isLoadingMore = false,
  emptyMessage = "No articles found.",
}: StaticArticleListProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  console.log("[v0] Rendering", articles.length, "static articles")

  return (
    <div className="space-y-8">
      <div className={cn("grid gap-6 border-transparent shadow-xs", className)}>
        {articles.map((article, index) => (
          <ArticleCard key={`${article.id}-${index}`} article={article} layout={layout} priority={index < 3} />
        ))}
      </div>

      {showLoadMore && onLoadMore && (
        <div className="flex justify-center pt-6">
          <Button onClick={onLoadMore} disabled={isLoadingMore} variant="outline" className="bg-transparent">
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : (
              "Load more articles"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export function ArticleList(props: ArticleListProps) {
  if (isInfiniteProps(props)) {
    return <InfiniteArticleList {...props} />
  }

  return <StaticArticleList {...props} />
}
