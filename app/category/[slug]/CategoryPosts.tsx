import logger from '@/utils/logger'
"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { fetchCategoryPosts } from "@/lib/wordpress-api"
import { useInView } from "react-intersection-observer"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShareIcon } from "lucide-react"
import { getArticleUrl } from "@/lib/utils/routing"

interface CategoryPostsProps {
  initialPosts: any[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string
  }
  categorySlug: string
}

export default function CategoryPosts({ initialPosts, pageInfo: initialPageInfo, categorySlug }: CategoryPostsProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [pageInfo, setPageInfo] = useState(initialPageInfo)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasManuallyTriggered, setHasManuallyTriggered] = useState(false)
  const loadingRef = useRef<HTMLDivElement>(null)

  // Use react-intersection-observer for better infinite scroll detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "200px 0px",
  })

  const loadMorePosts = useCallback(async () => {
    if (!pageInfo.hasNextPage || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchCategoryPosts(categorySlug, pageInfo.endCursor)
      if (data && data.posts) {
        // Use a functional update to ensure we're working with the latest state
        setPosts((prevPosts) => [...prevPosts, ...data.posts.nodes])
        setPageInfo(data.posts.pageInfo)
      }
    } catch (err) {
      logger.error("Error loading more posts:", err)
      setError("Failed to load more posts. Please try again.")
    } finally {
      setIsLoading(false)
      setHasManuallyTriggered(false)
    }
  }, [categorySlug, pageInfo.endCursor, pageInfo.hasNextPage, isLoading])

  // Handle automatic loading when scrolled into view
  useEffect(() => {
    if (inView && !isLoading && pageInfo.hasNextPage && !hasManuallyTriggered) {
      loadMorePosts()
    }
  }, [inView, loadMorePosts, isLoading, pageInfo.hasNextPage, hasManuallyTriggered])

  // Handle manual "Load More" button click
  const handleLoadMore = () => {
    setHasManuallyTriggered(true)
    loadMorePosts()
  }

  // Function to share a post
  const sharePost = (post: any, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (navigator.share) {
      navigator
        .share({
          title: post.title,
          url: getArticleUrl(post.slug),
        })
        .catch((err) => logger.error("Error sharing:", err))
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(`${window.location.origin}${getArticleUrl(post.slug)}`)
      alert("Link copied to clipboard!")
    }
  }

  return (
    <div className="space-y-4">
      {posts.length === 0 && !isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No posts found in this category.</p>
        </div>
      ) : (
        <>
          {posts.map((post: any) => (
            <div
              key={post.id}
              className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <Link
                href={getArticleUrl(post.slug)}
                className="flex flex-col sm:flex-row items-start p-3 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="relative w-full sm:w-20 h-40 sm:h-20 flex-shrink-0 mb-3 sm:mb-0 sm:mr-3">
                  <Image
                    src={post.featuredImage?.node?.sourceUrl || "/placeholder.svg?height=80&width=80&query=news"}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 80px"
                    className="rounded-lg object-cover"
                    priority={false}
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjY2NjY2NjIiAvPgo8L3N2Zz4="
                  />
                </div>
                <div className="flex-grow flex flex-col justify-between w-full">
                  <h2 className="text-sm font-semibold leading-tight line-clamp-2 mb-2">{post.title}</h2>
                  {post.excerpt && (
                    <p
                      className="text-xs text-gray-600 line-clamp-2 mb-2"
                      dangerouslySetInnerHTML={{ __html: post.excerpt.replace(/<[^>]*>/g, "") }}
                    />
                  )}
                  <div className="flex justify-between items-center text-xs mt-auto">
                    <p className="text-gray-500">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <button
                      onClick={(e) => sharePost(post, e)}
                      className="text-gray-500 hover:text-blue-600 p-1 rounded-full"
                      aria-label="Share this article"
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </>
      )}

      {/* Loading and error states */}
      <div ref={inViewRef} className="py-4">
        {isLoading && (
          <div className="flex justify-center items-center py-4" ref={loadingRef}>
            <Loader2 className="h-6 w-6 animate-spin text-gray-500 mr-2" />
            <span className="text-gray-500">Loading more posts...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
            <p className="text-red-500 mb-2">{error}</p>
            <Button onClick={handleLoadMore} variant="outline" size="sm" className="mt-2 bg-transparent">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !error && pageInfo.hasNextPage && (
          <div className="flex justify-center py-4">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              className="text-gray-600 hover:text-gray-800 bg-transparent"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                "Load More Articles"
              )}
            </Button>
          </div>
        )}

        {!isLoading && !error && !pageInfo.hasNextPage && posts.length > 0 && (
          <div className="text-center py-4 text-gray-500 border-t border-gray-100 mt-4">
            <p>No more articles to load</p>
          </div>
        )}
      </div>
    </div>
  )
}
