import logger from "@/utils/logger";
"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDate } from "@/utils/date-utils"
import { CalendarIcon, Clock } from "lucide-react"
import { BookmarkButton } from "./BookmarkButton"
import { ShareButtons } from "./ShareButtons"
import AudioPlayer from "./AudioPlayer"
import { useUser } from "@/contexts/UserContext"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useArticleScrollPosition } from "@/hooks/useArticleScrollPosition"
import { RelatedPostsCarousel } from "./RelatedPostsCarousel"
import { useRelatedPosts } from "@/hooks/useRelatedPosts"

interface ArticleViewProps {
  post: {
    id: string
    slug: string
    title: string
    content: string
    date: string
    excerpt?: string
    featuredImage?: {
      node: {
        sourceUrl: string
        mediaDetails?: {
          width?: number
          height?: number
        }
      }
    }
    author?: {
      node: {
        name: string
        firstName?: string
        lastName?: string
        avatar?: {
          url: string
        }
      }
    }
    categories?: {
      edges: Array<{
        node: {
          name: string
          slug: string
        }
      }>
    }
    readingTime?: string
  }
}

export default function ArticleView({ post }: ArticleViewProps) {
  const { isAuthenticated } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id, title, content, date, featuredImage, author, categories, readingTime, excerpt, slug } = post
  const isNewVisit = useRef(true)
  const [hasInitialized, setHasInitialized] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)
  const lastScrollPosition = useRef(0)
  const isManualScrolling = useRef(false)
  const forceScrollToTop = useRef(false)

  // Extract categories for related posts
  const categoryIds = categories?.edges?.map((edge) => edge.node.slug) || []

  // Debug logging
  logger.info("ArticleView Debug:", {
    postId: id,
    categories: categoryIds,
    categoriesLength: categoryIds.length,
  })

  // Use the custom hook for related posts
  const {
    relatedPosts,
    loading: loadingRelated,
    error: relatedError,
  } = useRelatedPosts({
    postId: id,
    categories: categoryIds,
    tags: [], // Add tags if available in your post data structure
    limit: 8, // Increased limit for carousel
  })

  // Debug related posts
  logger.info("Related Posts Debug:", {
    relatedPosts,
    loading: loadingRelated,
    error: relatedError,
    postsCount: relatedPosts?.length || 0,
  })

  // Use our custom hook to manage scroll position
  const { scrollPosition, hasRestoredPosition, restoreScrollPosition, clearScrollPosition, saveScrollPosition } =
    useArticleScrollPosition(id)

  // Force scroll to top on initial load
  useEffect(() => {
    // Check if URL has a hash fragment (like #comments)
    const hasHash = window.location.hash !== ""

    // Force scroll to top on component mount
    const scrollToPageTop = () => {
      window.scrollTo({
        top: 0,
        behavior: "auto", // Use auto for immediate scroll
      })
    }

    // Execute scroll with a slight delay to ensure it overrides any browser behavior
    const timeoutId = setTimeout(() => {
      scrollToPageTop()

      // If there was a hash, remove it without triggering a navigation
      if (hasHash) {
        const newUrl = window.location.pathname + window.location.search
        window.history.replaceState(null, "", newUrl)
      }

      forceScrollToTop.current = false
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [])

  // Save scroll position periodically for signed-in users
  useEffect(() => {
    if (!isAuthenticated) return

    const handleScroll = () => {
      // Don't save position during programmatic scrolling
      if (isManualScrolling.current || forceScrollToTop.current) return

      const currentPosition = window.scrollY
      // Only save if we've scrolled more than 100px from last saved position
      if (Math.abs(currentPosition - lastScrollPosition.current) > 100) {
        lastScrollPosition.current = currentPosition
        saveScrollPosition(currentPosition)
      }
    }

    // Throttled scroll event listener
    let scrollTimeout: NodeJS.Timeout
    const throttledScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(handleScroll, 200)
    }

    window.addEventListener("scroll", throttledScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", throttledScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [isAuthenticated, id, saveScrollPosition])

  // Handle scroll position restoration for authenticated users
  useEffect(() => {
    if (!isAuthenticated || hasInitialized) return
    setHasInitialized(true)

    // Always force scroll to top first
    forceScrollToTop.current = true
    window.scrollTo({
      top: 0,
      behavior: "auto", // Use auto for immediate scroll
    })

    // If this is a new visit and we have a saved position
    if (isNewVisit.current && scrollPosition > 0 && !hasRestoredPosition) {
      // Set flag to prevent saving during programmatic scrolling
      isManualScrolling.current = true

      // Show a notification that we're restoring position
      const notification = document.createElement("div")
      notification.className =
        "fixed bottom-4 right-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-md z-50 flex items-center justify-between"
      notification.innerHTML = `
        <span>Restore your reading position?</span>
        <div class="ml-4 flex space-x-2">
          <button class="px-2 py-1 bg-white text-black rounded-md text-sm restore-btn">Restore</button>
          <button class="px-2 py-1 bg-gray-600 text-white rounded-md text-sm cancel-btn">Stay at top</button>
        </div>
      `
      document.body.appendChild(notification)

      // Add event listener to the restore button
      const restoreButton = notification.querySelector(".restore-btn")
      if (restoreButton) {
        restoreButton.addEventListener("click", () => {
          // Clear the timeout, remove notification, and restore position
          if (restoreTimeout) clearTimeout(restoreTimeout)
          document.body.removeChild(notification)
          restoreScrollPosition()

          // Reset flags after scrolling
          setTimeout(() => {
            isManualScrolling.current = false
            forceScrollToTop.current = false
          }, 1000)
        })
      }

      // Add event listener to the cancel button
      const cancelButton = notification.querySelector(".cancel-btn")
      if (cancelButton) {
        cancelButton.addEventListener("click", () => {
          // Clear the timeout, remove notification, and stay at top
          if (restoreTimeout) clearTimeout(restoreTimeout)
          document.body.removeChild(notification)
          clearScrollPosition()
          isManualScrolling.current = false
          forceScrollToTop.current = false
        })
      }

      // Auto-dismiss the notification after 10 seconds
      const restoreTimeout = setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
        isManualScrolling.current = false
        forceScrollToTop.current = false
      }, 10000)

      return () => {
        if (restoreTimeout) clearTimeout(restoreTimeout)
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }
    } else {
      // Reset flags
      isManualScrolling.current = false
      forceScrollToTop.current = false
    }

    isNewVisit.current = false
  }, [isAuthenticated, scrollPosition, hasRestoredPosition, restoreScrollPosition, clearScrollPosition, hasInitialized])

  // Add a scroll to top button that appears when scrolling down
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Clear scroll position when user explicitly navigates to a different article
  useEffect(() => {
    return () => {
      // This runs when the component unmounts
      // We don't clear if it's a page refresh or browser navigation
      if (performance.navigation?.type !== 1) {
        // 1 is TYPE_RELOAD
        // We keep the position in sessionStorage, just mark that we're leaving
        isNewVisit.current = true
      }
    }
  }, [id])

  const formatReadingTime = (time?: string) => {
    if (!time) return "5 min read"
    return `${time} min read`
  }

  const formattedDate = formatDate(date)

  // Extract the first category if available
  const primaryCategory = categories?.edges?.[0]?.node

  return (
    <article ref={articleRef} className="max-w-4xl mx-auto">
      {/* Article Header */}
      <header className="mb-8">
        {primaryCategory && (
          <Link
            href={`/category/${primaryCategory.slug}`}
            className="text-primary font-medium text-sm mb-2 inline-block"
          >
            {primaryCategory.name}
          </Link>
        )}

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>

        <div className="flex flex-wrap items-center text-sm text-gray-600 gap-4 mb-4">
          {author?.node && (
            <div className="flex items-center">
              {author.node.avatar?.url && (
                <Image
                  src={author.node.avatar.url || "/placeholder.svg"}
                  alt={author.node.name}
                  width={24}
                  height={24}
                  className="rounded-full mr-2"
                />
              )}
              <span>{author.node.firstName || author.node.name}</span>
            </div>
          )}

          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>{formattedDate}</span>
          </div>

          {readingTime && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatReadingTime(readingTime)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <ShareButtons
            title={title}
            url={pathname}
            description={excerpt}
            variant="outline"
            size="sm"
            className="flex items-center"
          />

          <BookmarkButton
            postId={id}
            title={title}
            slug={slug}
            featuredImage={
              featuredImage?.node?.sourceUrl
                ? {
                    url: featuredImage.node.sourceUrl,
                    width: featuredImage.node.mediaDetails?.width || 1200,
                    height: featuredImage.node.mediaDetails?.height || 800,
                  }
                : undefined
            }
            variant="outline"
            size="sm"
            className="flex items-center"
          />
        </div>
      </header>

      {/* Featured Image */}
      {featuredImage?.node?.sourceUrl && (
        <div className="relative w-full aspect-[16/9] mb-4 sm:mb-6">
          <Image
            src={featuredImage.node.sourceUrl || "/placeholder.svg"}
            alt={title}
            width={featuredImage.node.mediaDetails?.width || 1200}
            height={featuredImage.node.mediaDetails?.height || 800}
            className="w-full object-cover"
            loading="eager"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      )}

      {/* Audio Player */}
      <div className="mb-8">
        <AudioPlayer articleId={id} title={title} />
      </div>

      {/* Article Content */}
      <div className="prose prose-lg max-w-none mb-8" dangerouslySetInnerHTML={{ __html: content }} />

      {/* Article Footer with Sharing and Bookmarking */}
      <footer className="border-t border-gray-200 pt-6 mt-8 mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <ShareButtons
              title={title}
              url={pathname}
              description={excerpt}
              variant="outline"
              size="sm"
              className="flex items-center"
            />

            <BookmarkButton
              postId={id}
              title={title}
              slug={slug}
              featuredImage={
                featuredImage?.node?.sourceUrl
                  ? {
                      url: featuredImage.node.sourceUrl,
                      width: featuredImage.node.mediaDetails?.width || 1200,
                      height: featuredImage.node.mediaDetails?.height || 800,
                    }
                  : undefined
              }
              variant="outline"
              size="sm"
              className="flex items-center"
            />
          </div>
        </div>
      </footer>

      {/* Related Articles Carousel - Always show this section */}
      <div className="border-t border-gray-200 pt-8 mb-8">
        <RelatedPostsCarousel
          posts={relatedPosts || []}
          loading={loadingRelated}
          title="You might also like"
          className="px-0"
        />

        {/* Debug information - remove this in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>Post ID: {id}</p>
            <p>Categories: {categoryIds.join(", ") || "None"}</p>
            <p>Related Posts Count: {relatedPosts?.length || 0}</p>
            <p>Loading: {loadingRelated ? "Yes" : "No"}</p>
            {relatedError && <p className="text-red-600">Error: {relatedError}</p>}
          </div>
        )}
      </div>

      {/* Comments Section would go here */}
      <div id="comments-section" className="border-t border-gray-200 pt-8">
        {/* Comments component will be rendered here */}
        <div className="text-center text-gray-500 py-8">
          <p>Comments section will appear here</p>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-dark transition-opacity duration-300 z-50"
          aria-label="Scroll to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </article>
  )
}
