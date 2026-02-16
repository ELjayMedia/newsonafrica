"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowUp, Calendar, Clock, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import type { WordPressPost } from "@/types/wp"
import { ArticleBody } from "@/components/article/ArticleBody"
import { ArticlePageLayout } from "@/components/article/ArticlePageLayout"
import { ArticleHeader } from "@/components/article/ArticleHeader"
import { ArticleMostRead } from "@/components/article/ArticleMostRead"
import { ArticleRelatedSection } from "@/components/article/ArticleRelatedSection"
import { ShareButtons } from "@/components/ShareButtons"
import { BookmarkButton } from "@/components/BookmarkButton"
import { Button } from "@/components/ui/button"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"
import { transformWordPressEmbeds } from "@/lib/utils/wordpressEmbeds"
import { stripHtml } from "@/lib/search"
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { cn } from "@/lib/utils"

import type {
  FetchArticleWithFallbackActionInput,
  FetchArticleWithFallbackActionResult,
} from "./actions"
import { fetchArticleWithFallbackAction } from "./actions"

interface ArticleClientShellProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
  relatedPosts: WordPressPost[]
  fetchArticleWithFallback?: typeof fetchArticleWithFallbackAction
}

const WORDS_PER_MINUTE = 230

const countWordsFromText = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  return trimmed.split(/\s+/).filter(Boolean).length || undefined
}

const deriveReadingTimeFromText = (text: string) => {
  const words = countWordsFromText(text)
  if (!words) return undefined
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

const resolveRenderedText = (value: unknown): string => {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "rendered" in value && typeof (value as any).rendered === "string") {
    return (value as any).rendered
  }
  return ""
}

export function ArticleClientShell({
  slug,
  countryCode,
  sourceCountryCode,
  initialData,
  relatedPosts,
  fetchArticleWithFallback = fetchArticleWithFallbackAction,
}: ArticleClientShellProps) {
  const [articleData, setArticleData] = useState<WordPressPost | null>(initialData ?? null)
  const [currentRelatedPosts, setCurrentRelatedPosts] = useState<WordPressPost[]>(relatedPosts)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setArticleData(initialData ?? null)
    setCurrentRelatedPosts(relatedPosts)
  }, [initialData, relatedPosts])

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

  // Extract content
  const title = resolveRenderedText(articleData?.title)
  const excerpt = resolveRenderedText(articleData?.excerpt)
  const content = resolveRenderedText(articleData?.content)
  const publishedDate = articleData?.date

  // Author info
  const authorName =
    resolveRenderedText(articleData?.author?.node?.name ?? articleData?.author?.name) ||
    articleData?.author?.node?.name ||
    articleData?.author?.name ||
    undefined
  const authorAvatarUrl =
    (typeof articleData?.author?.node?.avatar?.url === "string"
      ? articleData.author.node.avatar.url
      : null) ??
    (typeof articleData?.author?.avatar_urls?.["96"] === "string"
      ? articleData.author.avatar_urls["96"]
      : null) ??
    null

  // Featured image
  const heroImage = articleData?.featuredImage?.node?.sourceUrl

  // Process content
  const sanitizedHtml = useMemo(
    () => transformWordPressEmbeds(sanitizeArticleHtml(rewriteLegacyLinks(content, countryCode))),
    [content, countryCode],
  )
  const sanitizedContentText = useMemo(() => stripHtml(content), [content])
  const readingTime = useMemo(() => deriveReadingTimeFromText(sanitizedContentText), [sanitizedContentText])
  const wordCount = useMemo(() => countWordsFromText(sanitizedContentText), [sanitizedContentText])

  // Category
  const category = articleData?.categories?.nodes?.[0]?.name

  const bookmarkPostId = articleData?.id ?? (typeof articleData?.databaseId === "number" ? String(articleData.databaseId) : slug)

  // Share info
  const shareUrl = `/${countryCode}/article/${slug}`
  const shareTitle = stripHtml(title)
  const shareDescription = stripHtml(excerpt || title)

  return (
    <ArticlePageLayout
      sidebar={
        <div className="space-y-8">
          {/* Most Read Widget */}
          <ArticleMostRead articles={currentRelatedPosts.slice(0, 5)} countryCode={countryCode} />

          {/* Ads Placeholder */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Advertisement
          </div>

          {/* Subscription CTA */}
          <Button size="lg" className="w-full" onClick={() => router.push(`/subscribe?country=${countryCode}`)}>
            Subscribe Now
          </Button>
        </div>
      }
    >
      {/* Main Article Content */}
      <div ref={contentRef} className="space-y-8">
        {/* Header with Metadata */}
        <ArticleHeader
          title={title}
          excerpt={excerpt}
          category={category}
          author={authorName}
          publishedDate={publishedDate}
          readingTime={readingTime}
          wordCount={wordCount}
          onShare={() => {
            // Share logic handled by ShareButtons below
          }}
          onBookmark={() => setIsBookmarked(!isBookmarked)}
          isBookmarked={isBookmarked}
        />

        {/* Share and Bookmark Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <ShareButtons title={shareTitle} url={shareUrl} description={shareDescription} variant="outline" />
          <BookmarkButton
            postId={bookmarkPostId}
            editionCode={countryCode}
            slug={slug}
            title={shareTitle || "Untitled Post"}
            excerpt={shareDescription}
            featuredImage={heroImage}
            onBookmarkChange={setIsBookmarked}
          />
        </div>

        {/* Featured Image */}
        {heroImage && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <Image
              src={heroImage}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 800px"
            />
          </div>
        )}

        {/* Article Body */}
        <ArticleBody html={sanitizedHtml} />

        {/* Related Articles */}
        {currentRelatedPosts.length > 0 && (
          <ArticleRelatedSection articles={currentRelatedPosts} countryCode={countryCode} />
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-transform hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
      )}
    </ArticlePageLayout>
  )
}
