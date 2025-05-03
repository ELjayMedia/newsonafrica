"use client"

import type React from "react"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Clock, Bookmark } from "lucide-react"
import { memo, useMemo, useCallback } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { formatDate } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazyLoad"
import { useBookmarks } from "@/contexts/BookmarksContext"

interface HorizontalCardProps {
  post: {
    id: string
    title: string
    slug: string
    date: string
    excerpt: string
    featuredImage?: {
      node?: {
        sourceUrl: string
      }
    }
    author?: {
      node?: {
        name: string
        slug: string
      }
    }
  }
  showBookmarkButton?: boolean
}

export const HorizontalCard = memo(function HorizontalCard({ post, showBookmarkButton }: HorizontalCardProps) {
  const router = useRouter()
  const blurDataURL = useMemo(() => generateBlurDataURL(80, 80), [])
  const formattedDate = useMemo(() => formatDate(post.date), [post.date])
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const isMarked = isBookmarked(post.id)

  const handleClick = useCallback(() => {
    router.push(`/post/${post.slug}`)
  }, [router, post.slug])

  const handleBookmarkToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (isMarked) {
        removeBookmark(post.id)
      } else {
        addBookmark(post)
      }
    },
    [isMarked, post, addBookmark, removeBookmark],
  )

  return (
    <ErrorBoundary>
      <article
        onClick={handleClick}
        className="flex flex-row items-center justify-between py-2 md:py-3 space-x-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-3 w-full mb-3 cursor-pointer relative"
      >
        <div className="flex flex-col justify-center flex-1 space-y-1 mr-2">
          <div>
            <h3 className="font-semibold text-sm leading-tight group-hover:text-blue-600 line-clamp-2">{post.title}</h3>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center">
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3 w-3" />
                <time>{formattedDate}</time>
              </div>
            </div>
          </div>
        </div>
        {post.featuredImage?.node?.sourceUrl && (
          <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-md">
            <Image
              src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
              alt={post.title}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
              placeholder="blur"
              blurDataURL={blurDataURL}
            />
          </div>
        )}

        {showBookmarkButton && (
          <button
            onClick={handleBookmarkToggle}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
            aria-label={isMarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Bookmark className={`h-4 w-4 ${isMarked ? "fill-current text-blue-600" : "text-gray-400"}`} />
          </button>
        )}
      </article>
    </ErrorBoundary>
  )
})
