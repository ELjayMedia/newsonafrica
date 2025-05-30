"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo, useMemo, useEffect, useCallback } from "react"
import { formatDate } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazyLoad"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"

interface Post {
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
}

interface NewsGridProps {
  posts: Post[]
  layout?: "vertical" | "horizontal" | "mixed"
  className?: string
  sportCategoryPosts?: Post[]
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
  // Memoize the load more callback
  const handleLoadMore = useCallback(() => {
    if (onLoadMore && isAuthorPage) {
      onLoadMore()
      setTimeout(() => setIsFetching(false), 500)
    }
  }, [onLoadMore, isAuthorPage])

  // Use the infinite scroll hook with the memoized callback
  const { isFetching, setIsFetching } = useInfiniteScroll(handleLoadMore)

  // Generate blur placeholders once
  const mainPostBlurURL = useMemo(() => generateBlurDataURL(400, 300), [])
  const secondaryPostsBlurURLs = useMemo(() => {
    const maxLength = Math.max(posts?.length || 0, sportCategoryPosts?.length || 0)
    return Array.from({ length: maxLength }, () => generateBlurDataURL(70, 70))
  }, [posts?.length, sportCategoryPosts?.length])

  // Check if we have posts
  const hasPosts = posts?.length > 0
  const hasSportCategoryPosts = sportCategoryPosts?.length > 0

  // Update fetching state when hasMorePosts changes
  useEffect(() => {
    if (!hasMorePosts) {
      setIsFetching(false)
    }
  }, [hasMorePosts, setIsFetching])

  // Early return if no posts and not showing sport category
  if (!hasPosts && !showSportCategory) return null

  // Extract main and secondary posts
  const mainPost = posts?.[0]
  const secondaryPosts = posts?.slice(1, 4) || []

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
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
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
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </div>
            </div>
          </Link>
        ))}

        {isFetching && (
          <div className="py-4 text-center" aria-live="polite" aria-busy="true">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
              role="status"
            >
              <span className="sr-only">Loading...</span>
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
        <SportCategorySection
          sportCategoryPosts={sportCategoryPosts}
          blurURLs={{ main: mainPostBlurURL, secondary: secondaryPostsBlurURLs }}
        />
      ) : (
        <RegularCategorySection
          mainPost={mainPost}
          secondaryPosts={secondaryPosts}
          blurURLs={{ main: mainPostBlurURL, secondary: secondaryPostsBlurURLs }}
        />
      )}
    </div>
  )
})

// Extract SportCategorySection as a separate component for better code organization
const SportCategorySection = memo(function SportCategorySection({
  sportCategoryPosts,
  blurURLs,
}: {
  sportCategoryPosts: Post[]
  blurURLs: { main: string; secondary: string[] }
}) {
  return (
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
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
              placeholder="blur"
              blurDataURL={blurURLs.main}
            />
          </div>
        )}
        <div className="p-2">
          <h2 className="text-sm font-bold mb-1 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
            {sportCategoryPosts[0]?.title}
          </h2>
          <div className="text-gray-600 text-xs font-light mb-1 line-clamp-2">{sportCategoryPosts[0]?.excerpt}</div>
          <div className="flex items-center text-gray-500 text-xs">
            <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
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
              <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors duration-200 mb-1">
                {post.title}
              </h3>
              <div className="flex items-center text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                <time dateTime={post.date} title={formatDate(post.date)}>
                  {formatDate(post.date)}
                </time>
              </div>
            </div>
            {post.featuredImage && (
              <div className="relative w-[70px] h-[70px] sm:w-[84px] sm:h-[84px] flex-shrink-0 overflow-hidden rounded-md">
                <Image
                  src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 70px, 84px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  placeholder="blur"
                  blurDataURL={blurURLs.secondary[index]}
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </>
  )
})

// Extract RegularCategorySection as a separate component for better code organization
const RegularCategorySection = memo(function RegularCategorySection({
  mainPost,
  secondaryPosts,
  blurURLs,
}: {
  mainPost: Post | undefined
  secondaryPosts: Post[]
  blurURLs: { main: string; secondary: string[] }
}) {
  if (!mainPost) return null

  return (
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
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
              placeholder="blur"
              blurDataURL={blurURLs.main}
            />
          </div>
        )}
        <div className="p-2">
          <h2 className="text-sm font-bold mb-1 group-hover:text-blue-600 transition-colors duration-200">
            {mainPost?.title}
          </h2>
          <div className="text-gray-600 text-xs font-light mb-1 line-clamp-2">{mainPost?.excerpt}</div>
          <div className="flex items-center text-gray-500 text-xs">
            <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
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
              <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors duration-200 mb-1">
                {post.title}
              </h3>
              <div className="flex items-center text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                <time dateTime={post.date} title={formatDate(post.date)}>
                  {formatDate(post.date)}
                </time>
              </div>
            </div>
            {post.featuredImage && (
              <div className="relative w-[70px] h-[70px] sm:w-[84px] sm:h-[84px] flex-shrink-0 overflow-hidden rounded-md">
                <Image
                  src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 70px, 84px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  placeholder="blur"
                  blurDataURL={blurURLs.secondary[index]}
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </>
  )
})
