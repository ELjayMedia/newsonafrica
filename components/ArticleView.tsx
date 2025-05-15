"use client"
import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDate } from "@/utils/date-utils"
import { CalendarIcon, Clock } from "lucide-react"
import { BookmarkButton } from "./BookmarkButton"
import { ShareButtons } from "./ShareButtons"
import AudioPlayer from "./AudioPlayer"
import { useUser } from "@/contexts/UserContext"
import { usePathname } from "next/navigation"
import { useArticleScrollPosition } from "@/hooks/useArticleScrollPosition"

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

  // Use our custom hook to manage scroll position
  const { scrollPosition, hasRestoredPosition, restoreScrollPosition, clearScrollPosition } =
    useArticleScrollPosition(id)

  // Handle scroll to top for authenticated users on new visits
  useEffect(() => {
    if (isAuthenticated && isNewVisit.current) {
      // Check if we have a saved position
      if (scrollPosition > 0 && !hasRestoredPosition) {
        // If we have a saved position, restore it
        restoreScrollPosition()
      } else {
        // If no saved position or first visit, scroll to top
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      }
      isNewVisit.current = false
    }
  }, [isAuthenticated, pathname, scrollPosition, hasRestoredPosition, restoreScrollPosition])

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
    <article className="max-w-4xl mx-auto">
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
        <div className="relative mb-8 rounded-lg overflow-hidden">
          <Image
            src={featuredImage.node.sourceUrl || "/placeholder.svg"}
            alt={title}
            width={featuredImage.node.mediaDetails?.width || 1200}
            height={featuredImage.node.mediaDetails?.height || 800}
            className="w-full object-cover"
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
      <footer className="border-t border-gray-200 pt-6 mt-8">
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
    </article>
  )
}
