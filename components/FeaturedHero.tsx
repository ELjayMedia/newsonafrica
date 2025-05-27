"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo } from "react"
import { generateBlurDataURL } from "@/utils/lazyLoad"

interface FeaturedHeroProps {
  post: {
    title: string
    excerpt?: string
    slug: string
    date: string
    featuredImage?:
      | {
          sourceUrl: string
        }
      | {
          node: {
            sourceUrl: string
          }
        }
  } | null
}

const getTimeAgo = (date: string) => {
  const now = new Date().getTime()
  const postTime = new Date(date).getTime()
  const diffInMinutes = Math.floor((now - postTime) / (1000 * 60))

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInMinutes < 1440) {
    const diffInHours = Math.floor(diffInMinutes / 60)
    return `${diffInHours}h ago`
  } else {
    const diffInDays = Math.floor(diffInMinutes / 1440)
    return `${diffInDays}d ago`
  }
}

export const FeaturedHero = memo(function FeaturedHero({ post }: FeaturedHeroProps) {
  // Use useMemo for expensive calculations
  const timeAgo = useMemo(() => (post ? getTimeAgo(post.date) : ""), [post])
  const blurDataURL = useMemo(() => generateBlurDataURL(700, 475), [])

  // Early return with null if post is null or undefined
  if (!post) return null

  // Extract title
  const title = post.title || "Untitled"

  // Extract excerpt
  const excerpt = post.excerpt || ""

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
    <Link href={`/post/${post.slug}`} className="block group">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-3/5 aspect-[16/9] relative overflow-hidden rounded-md">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="rounded-md transition-transform duration-300 group-hover:scale-105 object-cover"
            priority={true}
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{timeAgo}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold leading-tight group-hover:text-blue-600 transition-colors duration-200">
            {title}
          </h2>
          {excerpt && (
            <div
              className="text-gray-600 line-clamp-3 text-sm font-light"
              dangerouslySetInnerHTML={{ __html: excerpt }}
            />
          )}
        </div>
      </div>
    </Link>
  )
})
