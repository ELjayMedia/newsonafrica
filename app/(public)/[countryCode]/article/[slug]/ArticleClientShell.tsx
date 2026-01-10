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

const WORDS_PER_MINUTE = 230

const countWordsFromText = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length
  return words || null
}

const deriveReadingTimeFromText = (text: string) => {
  const words = countWordsFromText(text)
  if (!words) {
    return null
  }

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

const deriveKeyTakeawaysFromText = (text: string, fallbackTitle?: string) => {
  const baseText = text.trim() || fallbackTitle?.trim() || ""
  if (!baseText) {
    return []
  }

  return baseText
    .split(/[.!?]+/)
    .map((sentence) => sentence.replace(/^[\-\u2022•\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
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
  const sanitizedContentText = useMemo(() => stripHtml(content), [content])
  const sanitizedExcerptText = useMemo(() => stripHtml(excerpt || ""), [excerpt])
  const readingTimeMinutes = useMemo(
    () => deriveReadingTimeFromText(sanitizedContentText),
    [sanitizedContentText],
  )
  const wordCount = useMemo(() => countWordsFromText(sanitizedContentText), [sanitizedContentText])
  const keyTakeawaySource = sanitizedExcerptText || sanitizedContentText
  const keyTakeaways = useMemo(
    () => deriveKeyTakeawaysFromText(keyTakeawaySource, stripHtml(title)),
    [keyTakeawaySource, title],
  )

  const shareUrl = `/${countryCode}/article/${slug}`
  const shareTitle = stripHtml(title)
  const shareDescription = stripHtml(excerpt || title)
  const formattedPublishedDate = articleData?.date
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(articleData.date))
    : null
  const storySnapshotItems = [
    readingTimeMinutes ? { label: "Reading time", value: `${readingTimeMinutes} min read` } : null,
    wordCount ? { label: "Word count", value: wordCount.toLocaleString() } : null,
    formattedPublishedDate ? { label: "Published", value: formattedPublishedDate } : null,
    publicationDistance ? { label: "Updated", value: `${publicationDistance} ago` } : null,
    { label: "Origin edition", value: (currentSourceCountry ?? countryCode).toUpperCase() },
  ].filter((item): item is { label: string; value: string } => Boolean(item?.value))
  const handleSubscribe = () => {
    router.push(`/subscribe?country=${countryCode}`)
  }

  return (
    <>
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-muted/30 via-background to-background">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/15 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <article
              id="article-content"
              className="relative w-full max-w-3xl rounded-3xl border border-border/60 bg-background/80 px-4 py-6 shadow-lg ring-1 ring-border/30 backdrop-blur-lg sm:px-6 lg:mx-0 lg:max-w-none lg:px-10"
              ref={contentRef}
            >
              <header className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
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
                          className="rounded-full bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground"
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

                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    Feature story
                  </div>
                  <h1 className="font-bold text-balance text-3xl leading-tight text-foreground sm:text-4xl">
                    {title}
                  </h1>
                  {authorName && (
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
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
                            <User className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground font-medium">Written by</span>
                        <span className="text-base sm:text-lg font-semibold text-foreground">{authorName}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-sm md:text-base text-muted-foreground">
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
                  <figure className="rounded-2xl overflow-hidden">
                    <Image
                      src={heroImage.url || "/placeholder.svg"}
                      alt={heroImage.alt}
                      width={heroImage.width}
                      height={heroImage.height}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 768px"
                      priority
                      className="w-full h-auto aspect-video object-cover"
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
                <section id="comments" className="border-t border-border/80 pt-10 mt-12">
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

              <section className="border-t border-border/80 pt-10 mt-12">
                <div className="flex items-center gap-3 mb-4">
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

            <aside className="space-y-6 lg:sticky lg:top-24">
              <Card className="p-6 space-y-4 shadow-md">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Story snapshot</p>
                  <h3 className="text-xl font-semibold text-foreground">Need-to-know details</h3>
                </div>
                <dl className="space-y-4">
                  {storySnapshotItems.map((item) => (
                    <div key={`${item.label}-${item.value}`} className="flex items-start justify-between gap-3">
                      <dt className="text-sm text-muted-foreground">{item.label}</dt>
                      <dd className="text-sm font-semibold text-foreground text-right">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

              {keyTakeaways.length > 0 ? (
                <Card className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Key takeaways</p>
                    <h3 className="text-xl font-semibold text-foreground">What happened</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {keyTakeaways.map((point, index) => (
                      <li key={`${point}-${index}`} className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              <Card className="p-6 space-y-4 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Stay informed</p>
                  <h3 className="text-xl font-semibold text-foreground">Get more from News On Africa</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Unlock unlimited stories, newsletters, and briefings tailored to the {countryCode.toUpperCase()} edition.
                  </p>
                </div>
                <Button type="button" className="w-full" onClick={handleSubscribe}>
                  See subscription options
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={handleGiftArticle}>
                  Gift this story
                </Button>
              </Card>
            </aside>
          </div>
        </div>
      </div>

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
