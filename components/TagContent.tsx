"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ErrorBoundary from "@/components/ErrorBoundary"
import { fetchPostsByTag } from "@/lib/api/wordpress"

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
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-lg overflow-hidden shadow-md">
              <Link
                href={`/post/${post.slug}`}
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
