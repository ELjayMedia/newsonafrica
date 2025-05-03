"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchCategoryPosts } from "@/lib/wordpress-api"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import { useEffect } from "react"
import { HorizontalCard } from "./HorizontalCard"
import { CategoryAd } from "@/components/CategoryAd"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useInView } from "react-intersection-observer"

export function CategoryContent({ slug }: { slug: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = useInfiniteQuery({
    queryKey: ["category", slug],
    queryFn: ({ pageParam = null }) => fetchCategoryPosts(slug, pageParam),
    getNextPageParam: (lastPage) => (lastPage?.pageInfo?.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    onError: (error) => {
      console.error("Error fetching category posts:", error)
    },
  })

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <NewsGridSkeleton />
  if (isError) return <div>Error loading category: {(error as Error).message}</div>
  if (!data || !data.pages || data.pages.length === 0) return <div>No posts found for this category.</div>

  const category = data.pages[0]?.category
  const allPosts = data.pages.flatMap((page) => page.posts || [])

  // Separate posts for different sections
  const gridPosts = allPosts.slice(0, 10)
  const horizontalPosts = allPosts.slice(10)

  return (
    <ErrorBoundary>
      <div className="space-y-12 px-4 py-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">{category?.name}</h1>
        {category?.description && <p className="text-lg text-gray-600 mb-8 leading-relaxed">{category.description}</p>}
        <NewsGrid posts={gridPosts} layout="vertical" />

        <CategoryAd className="my-12" />

        <h2 className="text-2xl font-bold mb-8 text-gray-900">More from {category?.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {horizontalPosts
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((post) => (
              <HorizontalCard key={post.id} post={post} />
            ))}
        </div>
        <div ref={ref} className="mt-12 text-center">
          {isFetchingNextPage ? (
            <p className="text-gray-600 animate-pulse">Loading more articles...</p>
          ) : hasNextPage ? (
            <p className="text-gray-600">Scroll for more articles</p>
          ) : null}
        </div>
      </div>
    </ErrorBoundary>
  )
}
