"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock, TrendingUp } from "lucide-react"
import { cn, motionSafe } from "@/lib/utils"
import { getArticleUrl } from "@/lib/utils/routing"

interface RelatedPost {
  id: string
  title: string
  slug: string
  date: string
  excerpt?: string
  featuredImage?: {
    node: {
      sourceUrl: string
      altText?: string
    }
  }
  categories?: {
    nodes: Array<{
      name: string
      slug: string
    }>
  }
  author?: {
    node: {
      name: string
    }
  }
  readingTime?: number
  isPopular?: boolean
  similarity?: number
}

interface RelatedArticlesProps {
  posts: RelatedPost[]
  title?: string
  loading?: boolean
  className?: string
  layout?: "carousel" | "grid"
  showMetadata?: boolean
  countryCode?: string
}

export function RelatedArticles({
  posts,
  title = "You might also like",
  loading = false,
  className,
  layout = "carousel",
  showMetadata = true,
  countryCode = "sz",
}: RelatedArticlesProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScrollPosition()

    const resizeObserver = new ResizeObserver(checkScrollPosition)
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [posts])

  const scrollTo = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const cardWidth = 300 // Updated card width
    const visibleCards = Math.floor(container.clientWidth / cardWidth)
    const scrollAmount = cardWidth * Math.max(1, visibleCards - 1)

    const newScrollLeft =
      direction === "left"
        ? Math.max(0, container.scrollLeft - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount)

    container.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    })

    // Update current index for indicators
    setCurrentIndex(Math.round(newScrollLeft / cardWidth))
  }

  const LoadingSkeleton = () => (
    <div className="relative">
      <div
        className={cn(
          layout === "carousel" ? "flex gap-6 overflow-hidden" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {[...Array(layout === "carousel" ? 4 : 6)].map((_, i) => (
          <div key={i} className={cn("animate-pulse", layout === "carousel" ? "flex-shrink-0 w-72" : "")}>
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 aspect-[16/10] rounded-xl mb-4 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="space-y-3">
              <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%]"></div>
              <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-4/5 animate-shimmer bg-[length:200%_100%]"></div>
              <div className="flex gap-2">
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-20 animate-shimmer bg-[length:200%_100%]"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-16 animate-shimmer bg-[length:200%_100%]"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const ArticleCard = ({ post }: { post: RelatedPost }) => (
    <Link
      href={getArticleUrl(post.slug, countryCode)}
      className={cn("group block", layout === "carousel" ? "flex-shrink-0 w-72" : "")}
    >
      <article
        className={cn(
          "bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100 h-full flex flex-col group-hover:scale-[1.02] group-hover:-translate-y-1",
          motionSafe.transform,
        )}
      >
        {/* Enhanced image with overlay and badges */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={
              post.featuredImage?.node?.sourceUrl ||
              `/placeholder.svg?height=200&width=320&text=${encodeURIComponent(post.title.substring(0, 30)) || "/placeholder.svg"}`
            }
            alt={post.featuredImage?.node?.altText || post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={cn(
              "object-cover transition-all duration-700 group-hover:scale-110",
              motionSafe.transform,
            )}
            loading="lazy"
          />

          {/* Gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500",
              motionSafe.transition,
            )}
          />

          <div className="absolute top-3 left-3 flex gap-2">
            {post.isPopular && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending
              </div>
            )}
          </div>

          {/* Reading time overlay */}
          {post.readingTime && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
              {post.readingTime} min read
            </div>
          )}
        </div>

        {/* Enhanced content section */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Category tag */}
          {showMetadata && post.categories?.nodes?.[0] && (
            <div className="mb-3">
              <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                {post.categories.nodes[0].name}
              </span>
            </div>
          )}

          {/* Title with better typography */}
          <h3
            className={cn(
              "font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 text-lg leading-tight",
              motionSafe.transition,
            )}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-gray-600 mb-4 line-clamp-2 text-sm leading-relaxed flex-1">
              {post.excerpt.replace(/<[^>]*>/g, "").substring(0, 120)}...
            </p>
          )}

          {/* Enhanced metadata footer */}
          {showMetadata && (
            <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                {post.author?.node?.name && <span className="text-gray-400">by {post.author.node.name}</span>}
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  )

  const EmptyState = () => (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No related articles yet</h3>
      <p className="text-gray-600 mb-4">We're working on finding the perfect content for you.</p>
      <p className="text-sm text-gray-500">Check back soon for recommendations!</p>
    </div>
  )

  return (
    <section className={cn("my-12", className)}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{title}</h2>

        {posts.length > 0 && layout === "carousel" && (
          <div className="text-sm text-gray-500">
            {posts.length} article{posts.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : posts && posts.length > 0 ? (
        layout === "carousel" ? (
          // Enhanced carousel layout
          <div className="relative group">
            {/* Navigation buttons with better styling */}
            {canScrollLeft && (
              <button
                onClick={() => scrollTo("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white shadow-xl rounded-full p-3 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm border border-gray-200"
                aria-label="Previous articles"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {canScrollRight && (
              <button
                onClick={() => scrollTo("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white shadow-xl rounded-full p-3 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm border border-gray-200"
                aria-label="Next articles"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Carousel container with enhanced scrolling */}
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
              onScroll={checkScrollPosition}
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {posts.map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>

            {/* Enhanced scroll indicators */}
            {posts.length > 3 && (
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: Math.ceil(posts.length / 3) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const targetScroll = index * 300 * 3
                      scrollContainerRef.current?.scrollTo({
                        left: targetScroll,
                        behavior: "smooth",
                      })
                    }}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300 hover:scale-125",
                      Math.floor(currentIndex / 3) === index ? "bg-blue-600 w-6" : "bg-gray-300 hover:bg-gray-400",
                    )}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Enhanced grid layout
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
        )
      ) : (
        <EmptyState />
      )}

      {/* Enhanced custom styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </section>
  )
}
