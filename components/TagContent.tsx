"use client"

import useSWRInfinite from "swr/infinite"
import { useInView } from "react-intersection-observer"
import { useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ErrorBoundary from "@/components/ErrorBoundary"
import { fetchPostsByTag } from "@/lib/wordpress-api"
import { getArticleUrl } from "@/lib/utils/routing"

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

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite(
    (index, previousPage) => {
      if (previousPage && !previousPage.pageInfo.hasNextPage) return null
      const cursor = index === 0 ? null : previousPage.pageInfo.endCursor
      return ["tagPosts", slug, cursor]
    },
    ([_, slug, cursor]) => fetchPostsByTag(slug, cursor),
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

  const posts = data?.flatMap((page) => page.nodes) || []

  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Articles tagged with "{tag.name}"</h1>
        {tag.description && <p className="text-gray-600 mb-6">{tag.description}</p>}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-lg overflow-hidden shadow-md">
              <Link
                href={getArticleUrl(post.slug)}
                className="flex items-start p-3 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="relative w-20 h-20 flex-shrink-0 mr-3">
                  <Image
                    src={post.featuredImage?.node?.sourceUrl || "/placeholder.jpg"}
                    alt={post.title}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                </div>
                <div className="flex-grow flex flex-col justify-between">
                  <h2 className="text-sm font-semibold leading-tight">{post.title}</h2>
                  <div className="flex justify-between text-xs mt-2">
                    <p className="text-gray-500">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <button className="text-blue-600 hover:text-blue-800">Share</button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
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
