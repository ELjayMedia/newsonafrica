"use client"

import useSWRInfinite from "swr/infinite"
import { fetchAuthorData } from "@/lib/wordpress-api"
import Image from "next/image"
import { NewsGrid } from "@/components/NewsGrid"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import { Button } from "@/components/ui/button"

interface AuthorContentProps {
  slug: string
}

export function AuthorContent({ slug }: AuthorContentProps) {
  const { ref, inView } = useInView()

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite(
    (index, previousPage) => {
      if (previousPage && !previousPage.posts.pageInfo.hasNextPage) return null
      const cursor = index === 0 ? null : previousPage.posts.pageInfo.endCursor
      return ["author", slug, cursor]
    },
    ([_, slug, cursor]) => fetchAuthorData(slug, cursor),
    {
      revalidateOnFocus: false,
    },
  )

  const fetchNextPage = useCallback(() => setSize(size + 1), [size, setSize])
  const hasNextPage = data?.[data.length - 1]?.posts.pageInfo.hasNextPage
  const isFetchingNextPage = isValidating && size > (data?.length || 0)

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <AuthorSkeleton />

  // Improved error handling
  if (error) {
    console.error("Author content error:", error)
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Unable to load author data</h2>
        <p className="text-gray-600 mb-6">
          We're having trouble connecting to our content server. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (!data || !data[0]) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Author not found</h2>
        <p className="text-gray-600">
          We couldn't find an author with this name. They may have been removed or renamed.
        </p>
      </div>
    )
  }

  const author = data[0]
  const posts = data.flatMap((page) => page?.posts.nodes ?? [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <div className="mr-6">
          <Image
            src={author.avatar.url || "/placeholder.svg?height=100&width=100&query=avatar"}
            alt={author.name}
            width={100}
            height={100}
            className="rounded-full"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{author.name}</h1>
          {author.description && <p className="text-gray-600">{author.description}</p>}
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Articles by {author.name}</h2>
        {posts.length > 0 ? (
          <>
            <NewsGrid posts={posts} layout="vertical" />
            {hasNextPage && (
              <div ref={ref} className="flex justify-center mt-8">
                <Button onClick={fetchNextPage} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <p>No articles found for this author.</p>
        )}
      </div>
    </div>
  )
}

function AuthorSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Skeleton className="w-24 h-24 rounded-full mr-6" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-8 w-64 mb-4" />
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}
