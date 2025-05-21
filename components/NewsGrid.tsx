"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo, useEffect } from "react"
import { formatDate } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazyLoad"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"

interface NewsGridProps {
  posts: Array<{
    id: string
    title: string
    excerpt: string
    slug: string
    date: string
    type?: string
    featuredImage?: {
      node: {
        sourceUrl: string
      }
    }
  }>
  layout?: "vertical" | "horizontal" | "mixed"
  className?: string
  sportCategoryPosts?: Array<{
    id: string
    title: string
    excerpt: string
    slug: string
    date: string
    type?: string
    featuredImage?: {
      node: {
        sourceUrl: string
      }
    }
  }>
  showSportCategory?: boolean
  isAuthorPage?: boolean
  onLoadMore?: () => void
  hasMorePosts?: boolean
}

export const NewsGrid = memo(function NewsGrid({
  posts,
  layout = "mixed",
  className = "",
  sportCategoryPosts = [],
  showSportCategory = false,
  isAuthorPage = false,
  onLoadMore,
  hasMorePosts,
}: NewsGridProps) {
  const { isFetching, setIsFetching } = useInfiniteScroll(() => {
    if (onLoadMore && isAuthorPage) {
      onLoadMore()
      setTimeout(() => setIsFetching(false), 500)
    }
  })

  const mainPostBlurURL = useMemo(() => generateBlurDataURL(400, 300), [])
  const secondaryPostsBlurURLs = useMemo(() => {
    const maxLength = Math.max(posts.length, sportCategoryPosts.length)
    const blurURLs: string[] = []
    for (let i = 0; i < maxLength; i++) {
      blurURLs.push(generateBlurDataURL(70, 70))
    }
    return blurURLs
  }, [posts.length, sportCategoryPosts.length])

  const hasPosts = posts?.length > 0
  const hasSportCategoryPosts = sportCategoryPosts?.length > 0

  useEffect(() => {
    if (!hasMorePosts) {
      setIsFetching(false)
    }
  }, [hasMorePosts, setIsFetching])

  if (!hasPosts && !showSportCategory) return null

  const mainPost = posts?.[0]
  const secondaryPosts = posts?.slice(1, 4) || []
  const mainSportPost = sportCategoryPosts?.[0]
  const secondarySportPosts = sportCategoryPosts?.slice(1, 4) || []

  // If using for author page, render horizontal cards with infinite scroll
  if (isAuthorPage) {
    return (
      <div className={`space-y-4 ${className}`}>
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.slug}`}
            className="flex flex-col sm:flex-row gap-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            {post.featuredImage && (
              <div className="relative h-48 sm:h-auto sm:w-1/3 overflow-hidden">
                <Image
                  src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={post.title}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-300 hover:scale-105"
                  placeholder="blur"
                  blurDataURL={mainPostBlurURL}
                />
              </div>
            )}
            <div className="p-4 sm:w-2/3 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold mb-2 line-clamp-2">{post.title}</h2>
                <div className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</div>
              </div>
              <div className="flex items-center text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </div>
            </div>
          </Link>
        ))}

        {isFetching && (
          <div className="py-4 text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
              role="status"
            >
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
              </span>
            </div>
          </div>
        )}

        {!isFetching && !hasMorePosts && posts.length > 0 && (
          <div className="py-4 text-center text-gray-500">No more articles to load</div>
        )}
      </div>
    )
  }

  // Original grid layout for non-author pages
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${className}`}>
      {showSportCategory && hasSportCategoryPosts ? (
        <>
          {/* Sport Category Header */}
          <div className="md:col-span-2 flex items-center mb-2">
            <h2 className="text-lg font-bold text-blue-600">Sports News</h2>
            <Link href="/category/sport" className="ml-auto text-sm text-blue-500 hover:underline">
              View all
            </Link>
          </div>

          {/* Main Sport Article */}
          <Link
            href={`/post/${sportCategoryPosts[0]?.slug}`}
            className="md:col-span-1 group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
          >
            {sportCategoryPosts[0]?.featuredImage && (
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={sportCategoryPosts[0].featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={sportCategoryPosts[0].title}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-md transition-transform duration-300 group-hover:scale-105"
                  placeholder="blur"
                  blurDataURL={mainPostBlurURL}
                />
              </div>
            )}
            <div className="p-2">
              <h2 className="text-sm font-bold mb-1 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
                {sportCategoryPosts[0]?.title}
              </h2>
              <div className="text-gray-600 text-xs font-light mb-1 line-clamp-2">{sportCategoryPosts[0]?.excerpt}</div>
              <div className="flex items-center text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                <time dateTime={sportCategoryPosts[0]?.date}>{formatDate(sportCategoryPosts[0]?.date)}</time>
              </div>
            </div>
          </Link>

          {/* Secondary Sport Articles Column */}
          <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-1 md:gap-2">
            {sportCategoryPosts.slice(1, 4).map((post, index) => (
              <Link
                key={post.id}
                href={`/post/${post.slug}`}
                className="flex gap-2 items-start bg-white p-1 px-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors duration-200 mb-1 line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center text-gray-500 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    <time dateTime={post.date} title={formatDate(post.date)}>
                      {formatDate(post.date)}
                    </time>
                  </div>
                </div>
                {post.featuredImage && (
                  <div className="relative w-[70px] h-[70px] flex-shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL={secondaryPostsBlurURLs[index]}
                    />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Main Featured Article */}
          <Link
            href={`/post/${mainPost?.slug}`}
            className="md:col-span-1 group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
          >
            {mainPost?.featuredImage && (
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={mainPost.featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={mainPost.title}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-md transition-transform duration-300 group-hover:scale-105"
                  placeholder="blur"
                  blurDataURL={mainPostBlurURL}
                />
              </div>
            )}
            <div className="p-2">
              <h2 className="text-sm font-bold mb-1 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
                {mainPost?.title}
              </h2>
              <div className="text-gray-600 text-xs font-light mb-1 line-clamp-2">{mainPost?.excerpt}</div>
              <div className="flex items-center text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                <time dateTime={mainPost?.date}>{formatDate(mainPost?.date)}</time>
              </div>
            </div>
          </Link>

          {/* Secondary Articles Column */}
          <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-1 md:gap-2">
            {secondaryPosts.map((post, index) => (
              <Link
                key={post.id}
                href={`/post/${post.slug}`}
                className="flex gap-2 items-start bg-white p-1 px-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors duration-200 mb-1 line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center text-gray-500 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    <time dateTime={post.date} title={formatDate(post.date)}>
                      {formatDate(post.date)}
                    </time>
                  </div>
                </div>
                {post.featuredImage && (
                  <div className="relative w-[70px] h-[70px] flex-shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL={secondaryPostsBlurURLs[index]}
                    />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
})
