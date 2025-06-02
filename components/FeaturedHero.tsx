"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
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
    author?: {
      node: {
        name: string
      }
    }
  }
}

export const FeaturedHero = memo(function FeaturedHero({ post }: FeaturedHeroProps) {
  const formattedDate = useMemo(() => {
    return formatDistanceToNow(new Date(post.date), { addSuffix: true })
  }, [post.date])

  const blurDataURL = useMemo(() => generateBlurDataURL(800, 450), [])

  return (
    <Link href={`/post/${post.slug}`} className="block group">
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <div className="relative aspect-[16/9] md:aspect-auto md:h-full w-full overflow-hidden rounded-lg">
          <Image
            src={post.featuredImage?.node.sourceUrl || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 group-hover:text-blue-600 transition-colors duration-200">
            {post.title}
          </h1>
          <div
            className="text-gray-600 text-xs md:text-sm line-clamp-3"
            style={{ marginBottom: "1vw" }}
            dangerouslySetInnerHTML={{ __html: post.excerpt }}
          />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
})
