"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArticleList } from "@/components/ArticleList"
import { ArticleBody } from "@/components/article/ArticleBody"
import { BookmarkButton } from "@/components/BookmarkButton"
import { CommentList } from "@/components/CommentList"
import { ShareButtons } from "@/components/ShareButtons"
import { ArrowUp, Calendar, ChevronLeft, ChevronRight, Gift, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import type { WordPressPost } from "@/types/wp"
import type { Comment } from "@/lib/supabase-schema"
import type {
  FetchArticleWithFallbackActionInput,
  FetchArticleWithFallbackActionResult,
} from "./actions"
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"
import { transformWordPressEmbeds } from "@/lib/utils/wordpressEmbeds"
import { stripHtml } from "@/lib/search"

interface ArticleClientShellProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
  relatedPosts: WordPressPost[]
  fetchArticleWithFallback: (
    input: FetchArticleWithFallbackActionInput,
  ) => Promise<FetchArticleWithFallbackActionResult>
  initialComments?: Comment[]
  initialCommentCursor?: string | null
  initialCommentHasMore?: boolean
  initialCommentTotal?: number
}

const resolveRenderedText = (value: unknown): string => {
  if (typeof value === "string") {
    return value
  }

  if (
    value &&
    typeof value === "object" &&
    "rendered" in value &&
    typeof (value as { rendered?: unknown }).rendered === "string"
  ) {
    return (value as { rendered: string }).rendered
  }

  return ""
}

export function ArticleClientShell({
  slug,
  countryCode,
  sourceCountryCode,
  initialData,
  relatedPosts,
  fetchArticleWithFallback,
  initialComments,
  initialCommentCursor,
  initialCommentHasMore,
  initialCommentTotal,
}: ArticleClientShellProps) {
  const [articleData, setArticleData] = useState<WordPressPost | null>(initialData ?? null)
  const [currentRelatedPosts, setCurrentRelatedPosts] = useState<WordPressPost[]>(relatedPosts)
  const [currentSourceCountry, setCurrentSourceCountry] = useState<string | undefined>(
    sourceCountryCode,
  )
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [isRefreshing, startRefresh] = useTransition()
  const contentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setArticleData(initialData ?? null)
    setCurrentRelatedPosts(relatedPosts)
    setCurrentSourceCountry(sourceCountryCode)
    setRefreshError(null)
  }, [initialData, relatedPosts, sourceCountryCode])

  const postId = articleData?.id != null ? String(articleData.id) : undefined

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

  const handleGiftArticle = () => {
    const searchParams = new URLSearchParams({
      intent: "gift",
      article: slug,
      country: countryCode,
    })

    router.push(`/subscribe?${searchParams.toString()}`)
  }

  const applyArticleUpdate = useCallback(
    (result: FetchArticleWithFallbackActionResult) => {
      setArticleData(result.article)
      setCurrentRelatedPosts(result.relatedPosts)
      setCurrentSourceCountry(result.sourceCountry)
      setRefreshError(null)
    },
    [],
  )

  const hydrationStateRef = useRef({
    hasHydrated: false,
    lastSlug: slug,
    lastCountryCode: countryCode,
  })

  const shouldRefetchOnHydration = useMemo(() => {
    if (!initialData) {
      return true
    }

    const initialSlug =
      typeof initialData === "object" && initialData && "slug" in initialData
        ? (initialData as { slug?: unknown }).slug
        : undefined

    if (typeof initialSlug === "string" && initialSlug !== slug) {
      return true
    }

    if (sourceCountryCode && sourceCountryCode !== countryCode) {
      return true
    }

    return false
  }, [initialData, slug, sourceCountryCode, countryCode])

  useEffect(() => {
    let isCancelled = false

    const hydrationState = hydrationStateRef.current
    const hasHydrated = hydrationState.hasHydrated
    const slugChanged = hydrationState.lastSlug !== slug
    const countryChanged = hydrationState.lastCountryCode !== countryCode

    const shouldFetch = hasHydrated
      ? slugChanged || countryChanged
      : shouldRefetchOnHydration

    hydrationState.hasHydrated = true
    hydrationState.lastSlug = slug
    hydrationState.lastCountryCode = countryCode

    if (!shouldFetch) {
      return () => {
        isCancelled = true
      }
    }

    const fetchLatestArticle = async () => {
      try {
        const result = await fetchArticleWithFallback({ countryCode, slug })
        if (!isCancelled) {
          applyArticleUpdate(result)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch latest article", error)
        }
      }
    }

    void fetchLatestArticle()

    return () => {
      isCancelled = true
    }
  }, [
    applyArticleUpdate,
    countryCode,
    slug,
    fetchArticleWithFallback,
    shouldRefetchOnHydration,
  ])

  const refreshArticle = () => {
    if (isRefreshing) {
      return
    }

    startRefresh(async () => {
      try {
        setRefreshError(null)
        const result = await fetchArticleWithFallback({ countryCode, slug })
        applyArticleUpdate(result)
      } catch (error) {
        setRefreshError(error instanceof Error ? error.message : "Unexpected error")
      }
    })
  }

  const title = resolveRenderedText(articleData?.title)
  const excerpt = resolveRenderedText(articleData?.excerpt)
  const content = resolveRenderedText(articleData?.content)
  const publicationDistance = articleData?.date
    ? formatDistanceToNow(new Date(articleData.date))
    : null

  const authorName =
    resolveRenderedText(articleData?.author?.node?.name ?? articleData?.author?.name) ||
    articleData?.author?.node?.name ||
    articleData?.author?.name ||
    null
  const authorAvatarNode = articleData?.author?.node?.avatar
  const authorAvatarUrl =
    (typeof authorAvatarNode?.url === "string" && authorAvatarNode.url) ??
    (typeof articleData?.author?.avatar_urls?.["96"] === "string"
      ? articleData.author.avatar_urls["96"]
      : null) ??
    (typeof articleData?.author?.avatar_urls?.["48"] === "string"
      ? articleData.author.avatar_urls["48"]
      : null) ??
    null
  const featuredImageNode = articleData?.featuredImage?.node
  const heroImage = featuredImageNode?.sourceUrl
    ? {
        url: featuredImageNode.sourceUrl,
        width: featuredImageNode.mediaDetails?.width ?? 1200,
        height: featuredImageNode.mediaDetails?.height ?? 800,
        alt: featuredImageNode.altText || title || "Article image",
      }
    : undefined

  const sanitizedHtml = useMemo(
    () => transformWordPressEmbeds(sanitizeArticleHtml(rewriteLegacyLinks(content, countryCode))),
    [content, countryCode],
  )

  const shareUrl = `/${countryCode}/article/${slug}`
  const shareTitle = stripHtml(title)
  const shareDescription = stripHtml(excerpt || title)

  return (
    <>
      <article
        id="article-content"
        className="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:px-0 lg:py-0"
        ref={contentRef}
      >
        <header className="flex flex-wrap items-center gap-2.5 md:gap-3.5 text-sm md:text-base text-muted-foreground mb-2.5 rounded-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
            <div className="flex flex-wrap gap-2">
              {articleData?.categories?.nodes?.map((category: any) => {
                const renderedName = resolveRenderedText(category?.name)
                const fallbackName = typeof category?.name === "string" ? category.name : ""
                const name = renderedName || fallbackName
                if (!name) return null

                return (
                  <Badge
                    key={category.id ?? name}
                    variant="secondary"
                    className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                  >
                    {name}
                  </Badge>
                )
              })}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              {publicationDistance ? (
                <time dateTime={articleData?.date}>{publicationDistance} ago</time>
              ) : null}
            </div>
          </div>

          <h1 className="font-bold mb-6 text-balance leading-tight text-3xl text-foreground sm:text-3xl text-left tracking-tight leading-4 lg:mb-3 mt-1.5">
            {title}
          </h1>

          {authorName && (
            <div className="flex items-center gap-3 mb-6 lg:mb-8">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex-shrink-0">
                {authorAvatarUrl ? (
                  <Image
                    src={authorAvatarUrl || "/placeholder.svg"}
                    alt={authorName}
                    fill
                    sizes="(max-width: 640px) 3rem, (max-width: 1024px) 3.5rem, 4rem"
                    className="rounded-full object-cover ring-2 ring-border shadow-sm"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                    <User className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Written by</span>
                <span className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">{authorName}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 md:gap-3.5 text-sm md:text-base text-muted-foreground mb-2.5 rounded-full">
            <ShareButtons
              title={shareTitle}
              url={shareUrl}
              description={shareDescription || shareTitle}
              variant="outline"
              size="sm"
              className="flex items-center"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGiftArticle}
              aria-label="Gift article"
              className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            >
              <Gift className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Gift article</span>
              <span className="sm:hidden">Gift</span>
            </Button>
            {postId && (
              <BookmarkButton
                postId={postId}
                editionCode={countryCode}
                slug={slug}
                title={title}
                featuredImage={heroImage}
                variant="outline"
                size="sm"
                className="flex items-center"
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshArticle}
              disabled={isRefreshing}
              aria-label="Refresh article content"
              className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            >
              {isRefreshing ? "Refreshing..." : "Refresh article"}
            </Button>
          </div>

          {refreshError && (
            <p className="text-sm text-destructive" role="alert" aria-live="polite">
              We couldn&apos;t refresh the article: {refreshError}
            </p>
          )}

          {featuredImageNode?.sourceUrl && heroImage && (
            <figure className="mb-10 lg:mb-12 rounded-xl lg:rounded-2xl overflow-hidden">
              <Image
                src={heroImage.url || "/placeholder.svg"}
                alt={heroImage.alt}
                width={heroImage.width}
                height={heroImage.height}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 768px"
                priority
                className="w-full h-auto aspect-video object-cover rounded-xs shadow-none"
              />
              {featuredImageNode.caption && (
                <figcaption className="text-sm text-muted-foreground text-center mt-3 px-4">
                  {resolveRenderedText(featuredImageNode.caption) ||
                    (typeof featuredImageNode.caption === "string" ? featuredImageNode.caption : "")}
                </figcaption>
              )}
            </figure>
          )}
        </header>

        <ArticleBody html={sanitizedHtml} className="mb-12 lg:mb-16" />

        {postId && (
          <section id="comments" className="border-t border-border pt-10 mt-12 lg:mt-1.5 lg:pt-2.5">
            <CommentList
              postId={postId}
              editionCode={(currentSourceCountry ?? countryCode).toLowerCase()}
              initialComments={initialComments}
              initialCursor={initialCommentCursor}
              initialHasMore={initialCommentHasMore}
              initialTotal={initialCommentTotal}
            />
          </section>
        )}

        <section className="border-t border-border pt-10 mt-12 lg:mt-1.5 lg:pt-2.5">
          <div className="flex items-center gap-3 mb-2.5">
            <h2 className="text-2xl font-bold text-foreground lg:text-xl">Related Articles</h2>
          </div>

          {currentRelatedPosts.length > 0 ? (
            <ArticleList articles={currentRelatedPosts} layout="compact" showLoadMore={false} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No related articles found.</p>
            </div>
          )}
        </section>
      </article>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {showScrollTop && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="p-3 hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          </Card>
        )}

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-3 hover:bg-primary hover:text-primary-foreground transition-colors border-r"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${currentSourceCountry ?? countryCode}`)}
              className="p-3 hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Go to country page"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
