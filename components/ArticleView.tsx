"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { getCategoryUrl, rewriteLegacyLinks } from "@/lib/utils/routing"
import { formatDate } from "@/lib/utils/date"
import { CalendarIcon, Clock } from "lucide-react"
import { BookmarkButton } from "./BookmarkButton"
import { ShareButtons } from "./ShareButtons"
import { useUser } from "@/contexts/UserContext"
import { usePathname } from "next/navigation"
import { useArticleScrollPosition } from "@/hooks/useArticleScrollPosition"
import { RelatedArticles } from "./RelatedArticles"
import { useEnhancedRelatedPosts } from "@/hooks/useEnhancedRelatedPosts"

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
  const { id, title, content, date, featuredImage, author, categories, readingTime, excerpt, slug } = post
  const isNewVisit = useRef(true)
  const [hasInitialized, setHasInitialized] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)
  const lastScrollPosition = useRef(0)
  const isManualScrolling = useRef(false)
  const forceScrollToTop = useRef(false)

  // Extract categories for related posts
  const categoryIds = categories?.edges?.map((edge) => edge.node.slug) || []

  const {
    posts: relatedPosts,
    loading: loadingRelated,
    error: _relatedError,
  } = useEnhancedRelatedPosts({
    postId: id,
    categories: categoryIds,
    tags: [], // Add tags if available in your post data structure
    limit: 8, // Increased limit for carousel
    enableAI: false, // Disabled AI recommendations
    enablePopularityBoost: true, // Keep popularity-based sorting
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
        "fixed bottom-4 right-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-full z-50 flex items-center justify-between"
      notification.innerHTML = `
        <span>Restore your reading position?</span>
        <div class="ml-4 flex space-x-2">
          <button class="px-2 py-1 bg-white text-black rounded-full text-sm restore-btn">Restore</button>
          <button class="px-2 py-1 bg-gray-600 text-white rounded-full text-sm cancel-btn">Stay at top</button>
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
    <article ref={articleRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Article Header */}
      <header className="mb-8 lg:mb-12">
        {primaryCategory && (
          <Link
            href={getCategoryUrl(primaryCategory.slug)}
            className="text-primary font-semibold text-sm uppercase tracking-wide mb-4 inline-block hover:underline transition-all"
          >
            {primaryCategory.name}
          </Link>
        )}

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 lg:mb-8 leading-tight text-balance text-foreground">
          {title}
        </h1>

        <div className="flex flex-wrap items-center text-sm lg:text-base text-muted-foreground gap-4 lg:gap-6 mb-6">
          {author?.node && (
            <div className="flex items-center gap-2">
              {author.node.avatar?.url && (
                <Image
                  src={author.node.avatar.url || "/placeholder.svg"}
                  alt={author.node.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="font-medium">{author.node.firstName || author.node.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 lg:h-5 lg:w-5" />
            <time dateTime={date}>{formattedDate}</time>
          </div>

          {readingTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 lg:h-5 lg:w-5" />
              <span>{formatReadingTime(readingTime)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-8">
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
            country={(post as any).country}
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

      {featuredImage?.node?.sourceUrl && (
        <figure className="relative w-full aspect-[16/9] mb-8 lg:mb-10 rounded-xl lg:rounded-2xl overflow-hidden shadow-xl">
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
        </figure>
      )}

      <div
        className="prose prose-lg lg:prose-xl max-w-none mb-12 lg:mb-16
                   prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
                   prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:leading-tight
                   prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4
                   prose-h4:text-xl prose-h4:mt-8 prose-h4:mb-3
                   prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6 prose-p:text-lg
                   prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-a:transition-all
                   prose-strong:text-foreground prose-strong:font-semibold
                   prose-em:text-foreground prose-em:italic
                   prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                   prose-figure:my-10
                   prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-muted-foreground prose-figcaption:mt-3
                   prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:bg-muted/40 
                   prose-blockquote:rounded-r-lg prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:my-8
                   prose-blockquote:not-italic prose-blockquote:text-foreground/90
                   prose-code:bg-muted prose-code:text-foreground prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                   prose-code:before:content-none prose-code:after:content-none
                   prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-6
                   prose-pre:overflow-x-auto prose-pre:text-sm
                   prose-ol:my-6 prose-ol:pl-6 prose-ol:space-y-2
                   prose-ul:my-6 prose-ul:pl-6 prose-ul:space-y-2
                   prose-li:text-foreground prose-li:leading-relaxed prose-li:text-lg
                   prose-li:marker:text-primary
                   prose-table:my-8 prose-table:border-collapse
                   prose-thead:border-b-2 prose-thead:border-border
                   prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
                   prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-border prose-td:text-foreground
                   prose-hr:my-10 prose-hr:border-border"
        dangerouslySetInnerHTML={{
          __html: rewriteLegacyLinks(content || "", (post as any).country),
        }}
      />

      <footer className="border-t border-border pt-8 mt-12 mb-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
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
              country={(post as any).country}
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

      <div className="border-t border-border pt-10 mb-12">
        <RelatedArticles
          posts={relatedPosts || []}
          loading={loadingRelated}
          title="You might also like"
          layout="carousel"
          showMetadata={true}
          enableAI={false}
          className="px-0"
        />
      </div>

      {/* Comments Section would go here */}
      <div id="comments-section" className="border-t border-border pt-8">
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
