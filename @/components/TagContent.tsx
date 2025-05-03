"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import { HorizontalCard } from "@/components/HorizontalCard"
import { Button } from "@/components/ui/button"
import ErrorBoundary from "@/components/ErrorBoundary"
import { fetchPostsByTag } from "@/lib/wordpress-api"

interface TagContentProps {
  slug: string
  initialData: any
  tag: {
    name: string
    description?: string
  }
}

export function TagContent({ slug, initialData, tag }: TagContentProps) {
  const { ref, inView } = useInView()

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ["tagPosts", slug],
    queryFn: ({ pageParam = null }) => fetchPostsByTag(slug, pageParam),
    getNextPageParam: (lastPage) => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialData: { pages: [initialData], pageParams: [null] },
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (status === "loading") return <div>Loading...</div>
  if (status === "error") return <div>Error: {(error as Error).message}</div>

  const posts = data?.pages.flatMap((page) => page.nodes) || []

  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Articles tagged with "{tag.name}"</h1>
        {tag.description && <p className="text-gray-600 mb-6">{tag.description}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <HorizontalCard key={post.id} post={post} />
          ))}
        </div>
        <div ref={ref} className="mt-8 text-center">
          {isFetchingNextPage ? (
            <div>Loading more...</div>
          ) : hasNextPage ? (
            <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
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
