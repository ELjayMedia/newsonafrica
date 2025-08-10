"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo } from "react"
import { generateBlurDataURL } from "@/utils/lazyLoad"

interface VerticalCardProps {
  post: {
    title: string
    slug: string
    date: string
    type?: string
    featuredImage?:
      | {
          sourceUrl: string
        }
      | {
          node: {
            sourceUrl: string
          }
        }
  }
  className?: string
}

export const VerticalCard = memo(function VerticalCard({ post, className = "" }: VerticalCardProps) {
  const formattedDate = useMemo(() => {
    return new Date(post.date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    })
  }, [post.date])

  const blurDataURL = useMemo(() => generateBlurDataURL(300, 200), [])

  // Get featured image URL with fallback - handle both new and old API formats
  const imageUrl = (() => {
    if (!post.featuredImage) return "/placeholder.svg"

    // New API format
    if ("sourceUrl" in post.featuredImage) {
      return post.featuredImage.sourceUrl
    }

    // Old API format
    if ("node" in post.featuredImage) {
      return post.featuredImage.node.sourceUrl
    }

    return "/placeholder.svg"
  })()

  return (
    <Link href={`/post/${post.slug}`} className={`group block h-full ${className}`}>
      <article className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        {post.featuredImage && (
          <div className="relative h-32 overflow-hidden">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={post.title}
              fill
              className="transition-transform duration-300 group-hover:scale-105 object-cover"
              placeholder="blur"
              blurDataURL={blurDataURL}
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        )}
        <div className="p-3 flex-1 flex flex-col">
          {post.type && <div className="text-sm font-bold text-red-600 mb-1">{post.type}</div>}
          <h3 className="font-bold text-sm leading-tight group-hover:text-blue-600 transition-colors duration-200">
            {post.title}
          </h3>
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-auto pt-2">
            <Clock className="h-3 w-3" />
            <time>{formattedDate}</time>
          </div>
        </div>
      </article>
    </Link>
  )
})
