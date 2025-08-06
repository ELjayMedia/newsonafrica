"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo } from "react"
import { generateBlurDataURL } from "@/utils/lazyLoad"
import { PostCard } from "./PostCard"
import { cn } from "@/lib/utils"

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

  const imageUrl = (() => {
    if (!post.featuredImage) return "/placeholder.svg"

    if ("sourceUrl" in post.featuredImage) {
      return post.featuredImage.sourceUrl
    }

    if ("node" in post.featuredImage) {
      return post.featuredImage.node.sourceUrl
    }

    return "/placeholder.svg"
  })()

  const image = post.featuredImage ? (
    <Image
      src={imageUrl || "/placeholder.svg"}
      alt={post.title}
      fill
      className="transition-transform duration-300 group-hover:scale-105 object-cover"
      placeholder="blur"
      blurDataURL={blurDataURL}
    />
  ) : undefined

  const meta = (
    <div className="flex items-center gap-1 text-gray-500 text-xs pt-2">
      <Clock className="h-3 w-3" />
      <time>{formattedDate}</time>
    </div>
  )

  const title = (
    <>
      {post.type && <div className="text-sm font-bold text-red-600 mb-1">{post.type}</div>}
      <h3 className="font-bold text-sm leading-tight group-hover:text-blue-600 transition-colors duration-200">
        {post.title}
      </h3>
    </>
  )

  return (
    <Link href={`/post/${post.slug}`} className={cn("group block h-full", className)}>
      <PostCard
        image={image}
        title={title}
        meta={meta}
        className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
        imageClassName={post.featuredImage ? "relative h-32 overflow-hidden" : undefined}
        contentClassName="p-3 flex-1 flex flex-col"
      />
    </Link>
  )
})
