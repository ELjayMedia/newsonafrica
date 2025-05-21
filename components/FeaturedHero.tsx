"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo } from "react"
import { generateBlurDataURL } from "@/utils/lazyLoad"

interface FeaturedHeroProps {
  post: {
    title: string
    excerpt: string
    slug: string
    date: string
    featuredImage?: {
      node: {
        sourceUrl: string
      }
    }
  }
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
  const timeAgo = useMemo(() => (post ? getTimeAgo(post.date) : ""), [post?.date ?? ""])
  const blurDataURL = useMemo(() => generateBlurDataURL(700, 475), [])

  if (!post) return null

  // Ensure title is a string (handle potential HTML entities)
  const title = typeof post.title === "string" ? post.title : post.title?.rendered || "Untitled"

  // Ensure excerpt is a string
  const excerpt = typeof post.excerpt === "string" ? post.excerpt : post.excerpt?.rendered || ""

  // Get featured image URL
  const imageUrl =
    post.featuredImage?.node?.sourceUrl || post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "/placeholder.svg"

  return (
    <Link href={`/post/${post.slug}`} className="block group">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-3/5 aspect-[16/9] relative overflow-hidden rounded-md">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            layout="fill"
            objectFit="cover"
            className="rounded-md transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={true}
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-tight group-hover:text-blue-600 transition-colors duration-200">
            {title}
          </h1>
          <div
            className="text-gray-600 line-clamp-3 text-sm font-light"
            dangerouslySetInnerHTML={{ __html: excerpt }}
          />
        </div>
      </div>
    </Link>
  )
})
