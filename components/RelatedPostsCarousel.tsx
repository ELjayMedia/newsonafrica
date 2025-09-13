"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { getArticleUrl } from "@/lib/utils/routing"

interface Post {
  id: string
  title: string
  slug: string
  date: string
  excerpt?: string
  featuredImage?: {
    node: {
      sourceUrl: string
    }
  }
}

interface RelatedPostsCarouselProps {
  posts: Post[]
  title?: string
  loading?: boolean
  className?: string
}

export function RelatedPostsCarousel({
  posts,
  title = "Related Articles",
  loading = false,
  className,
}: RelatedPostsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Check scroll position to update navigation buttons
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScrollPosition()
  }, [posts])

  const scrollTo = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const cardWidth = 280 // Approximate card width including gap
    const scrollAmount = cardWidth * 2 // Scroll 2 cards at a time

    const newScrollLeft =
      direction === "left" ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    })
  }

  // Always show the section, even if loading or no posts
  return (
    <section className={cn("my-8", className)}>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>

      {loading ? (
        <div className="relative">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 animate-pulse">
                <div className="bg-gray-200 aspect-[16/10] rounded-lg mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="relative group">
          {/* Navigation Buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTo("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scrollTo("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          )}

          {/* Carousel Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            onScroll={checkScrollPosition}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {posts.map((post) => (
              <Link key={post.id} href={getArticleUrl(post.slug)} className="flex-shrink-0 w-64 group/card">
                <article className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 h-full">
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={
                        post.featuredImage?.node?.sourceUrl ||
                        "/placeholder.svg?height=200&width=320&text=Related+Article" ||
                        "/placeholder.svg"
                      }
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover/card:text-blue-600 transition-colors duration-200">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {post.excerpt.replace(/<[^>]*>/g, "").substring(0, 100)}...
                      </p>
                    )}

                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {/* Scroll Indicators */}
          {posts.length > 3 && (
            <div className="flex justify-center mt-4 space-x-1">
              {Array.from({ length: Math.ceil(posts.length / 2) }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-200",
                    Math.floor(currentIndex / 2) === index ? "bg-blue-600" : "bg-gray-300",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Show placeholder when no posts are available
        <div className="text-center py-8 text-gray-500">
          <p>No related articles found at the moment.</p>
          <p className="text-sm mt-2">Check back later for more content!</p>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
