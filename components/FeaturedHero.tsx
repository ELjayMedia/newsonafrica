"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { generateBlurDataURL } from "@/utils/lazy-load"
import { getArticleUrl } from "@/lib/utils/routing"
import { getFpTaggedPostsForCountry } from "@/lib/wordpress-api"
import { getCurrentCountry } from "@/lib/utils/routing"
import useSWR from "swr"
import type { HomePost } from "@/types/home"

interface FeaturedHeroProps {
  post?: {
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
  countryCode?: string
}

export const FeaturedHero = memo(function FeaturedHero({ post, countryCode }: FeaturedHeroProps) {
  const currentCountry = countryCode || getCurrentCountry()

  const {
    data: fpPosts,
    error,
    isLoading,
  } = useSWR(
    [`fp-posts-${currentCountry}`, currentCountry],
    async () => {
      try {
        const posts = await getFpTaggedPostsForCountry(currentCountry, 1)
        console.log(`[v0] Successfully fetched ${posts.length} fp-tagged posts for ${currentCountry}`)
        return posts
      } catch (error) {
        console.log(`[v0] No fp-tagged posts available for ${currentCountry}, using fallback`)
        // Return empty array instead of throwing error
        return []
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 300000, // 5 minutes
      fallbackData: post ? [post as HomePost] : [],
      errorRetryCount: 0,
      onError: (err) => {
        console.log(`[v0] FeaturedHero SWR error for ${currentCountry}:`, err.message)
      },
    },
  )

  const displayPost = fpPosts && fpPosts.length > 0 ? fpPosts[0] : post

  const formattedDate = useMemo(() => {
    if (!displayPost?.date) return ""
    return formatDistanceToNow(new Date(displayPost.date), { addSuffix: true })
  }, [displayPost?.date])

  const blurDataURL = useMemo(() => generateBlurDataURL(800, 450), [])

  if (isLoading && !displayPost) {
    return (
      <div className="animate-pulse">
        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
          <div className="relative aspect-[16/9] md:aspect-auto md:h-64 w-full overflow-hidden rounded-lg bg-gray-200"></div>
          <div className="flex flex-col justify-center space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!displayPost) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No featured content available</p>
      </div>
    )
  }

  return (
    <Link href={getArticleUrl(displayPost.slug)} className="block group">
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <div className="relative aspect-[16/9] md:aspect-auto md:h-full w-full overflow-hidden rounded-lg">
          <Image
            src={displayPost.featuredImage?.node.sourceUrl || "/placeholder.svg"}
            alt={displayPost.title}
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
            {displayPost.title}
          </h1>
          <div className="text-gray-600 text-xs md:text-sm line-clamp-3" style={{ marginBottom: "1vw" }}>
            {displayPost.excerpt.replace(/<[^>]*>/g, "")}
          </div>
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
