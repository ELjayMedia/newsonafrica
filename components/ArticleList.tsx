"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import useSWR from "swr"
import { ArticleCard } from "./ArticleCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { Article } from "@/types/article"
import type { Post } from "@/types/wordpress"

interface ArticleListProps {
  endpoint: string
  layout?: "compact" | "standard" | "featured"
  className?: string
  pageSize?: number
  gridCols?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  emptyMessage?: string
  errorMessage?: string
}

function ArticleCardSkeleton({ layout = "standard" }: { layout?: "compact" | "standard" | "featured" }) {
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

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export function ArticleList({
  endpoint,
  layout = "standard",
  className,
  pageSize = 12,
  gridCols = { default: 1, sm: 2, lg: 3 },
  emptyMessage = "No articles found.",
  errorMessage = "Failed to load articles. Please try again.",
}: ArticleListProps) {
  const [page, setPage] = useState(1)
  const [allArticles, setAllArticles] = useState<(Article | Post)[]>([])
  const [hasMore, setHasMore] = useState(true)

  const getUrl = useCallback(
    (pageNum: number) => {
      const url = new URL(endpoint, window.location.origin)
      url.searchParams.set("page", pageNum.toString())
      url.searchParams.set("per_page", pageSize.toString())
      return url.toString()
    },
    [endpoint, pageSize],
  )

  const { data, error, isLoading, mutate } = useSWR(getUrl(page), fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute
  })

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  })

  useEffect(() => {
    if (data?.articles || data?.posts || Array.isArray(data)) {
      const newArticles = data.articles || data.posts || data

      if (page === 1) {
        setAllArticles(newArticles)
      } else {
        setAllArticles((prev) => [...prev, ...newArticles])
      }

      // Check if there are more articles to load
      setHasMore(newArticles.length === pageSize)
    }
  }, [data, page, pageSize])

  useEffect(() => {
    if (inView && hasMore && !isLoading && !error) {
      setPage((prev) => prev + 1)
    }
  }, [inView, hasMore, isLoading, error])

  const handleRetry = () => {
    setPage(1)
    setAllArticles([])
    setHasMore(true)
    mutate()
  }

  const gridClasses = cn(
    "grid gap-6",
    `grid-cols-${gridCols.default}`,
    gridCols.sm && `sm:grid-cols-${gridCols.sm}`,
    gridCols.md && `md:grid-cols-${gridCols.md}`,
    gridCols.lg && `lg:grid-cols-${gridCols.lg}`,
    gridCols.xl && `xl:grid-cols-${gridCols.xl}`,
    className,
  )

  if (error && allArticles.length === 0) {
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

  if (isLoading && allArticles.length === 0) {
    return (
      <div className={gridClasses}>
        {Array.from({ length: pageSize }).map((_, index) => (
          <ArticleCardSkeleton key={index} layout={layout} />
        ))}
      </div>
    )
  }

  if (!isLoading && allArticles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className={gridClasses}>
        {allArticles.map((article, index) => (
          <ArticleCard
            key={`${article.id}-${index}`}
            article={article}
            layout={layout}
            priority={index < 3} // Prioritize first 3 images
          />
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading more articles...
            </div>
          ) : (
            <div className="h-4" /> // Invisible trigger element
          )}
        </div>
      )}

      {!hasMore && allArticles.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>You've reached the end of the articles.</p>
        </div>
      )}
    </div>
  )
}
