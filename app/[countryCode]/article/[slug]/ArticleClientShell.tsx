"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"
import { transformWordPressEmbeds } from "@/lib/utils/wordpressEmbeds"

interface ArticleClientShellProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
  relatedPosts: WordPressPost[]
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
}: ArticleClientShellProps) {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const postId = initialData?.id != null ? String(initialData.id) : undefined

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

  const title = resolveRenderedText(initialData?.title)
  const excerpt = resolveRenderedText(initialData?.excerpt)
  const content = resolveRenderedText(initialData?.content)

  const authorName =
    resolveRenderedText(initialData?.author?.node?.name ?? initialData?.author?.name) ||
    initialData?.author?.node?.name ||
    initialData?.author?.name ||
    null
  const authorAvatar =
    initialData?.author?.node?.avatar?.url ??
    initialData?.author?.avatar_urls?.["96"] ??
    initialData?.author?.avatar_urls?.["48"] ??
    null
  const featuredImageNode = initialData?.featuredImage?.node
  const heroImage = featuredImageNode?.sourceUrl
    ? {
        url: featuredImageNode.sourceUrl,
        width: featuredImageNode.mediaDetails?.width ?? 1200,
        height: featuredImageNode.mediaDetails?.height ?? 800,
      }
    : undefined

  const sanitizedHtml = useMemo(
    () => transformWordPressEmbeds(sanitizeArticleHtml(rewriteLegacyLinks(content, countryCode))),
    [content, countryCode],
  )

  const shareUrl = `/${countryCode}/article/${slug}`

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
              {initialData.categories?.nodes?.map((category: any) => {
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
              <time dateTime={initialData.date}>{formatDistanceToNow(new Date(initialData.date))} ago</time>
            </div>
          </div>

          <h1 className="font-bold mb-6 text-balance leading-tight text-3xl text-foreground sm:text-3xl text-left tracking-tight leading-4 lg:mb-3 mt-1.5">
            {title}
          </h1>

          {authorName && (
            <div className="flex items-center gap-3 mb-6 lg:mb-8">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex-shrink-0">
                {authorAvatar ? (
                  <img
                    src={authorAvatar || "/placeholder.svg"}
                    alt={authorName}
                    className="w-full h-full rounded-full object-cover ring-2 ring-border shadow-sm"
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
              title={title}
              url={shareUrl}
              description={excerpt || title}
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
                country={countryCode}
                slug={slug}
                title={title}
                featuredImage={heroImage}
                variant="outline"
                size="sm"
                className="flex items-center"
              />
            )}
          </div>

          {featuredImageNode?.sourceUrl && (
            <figure className="mb-10 lg:mb-12 rounded-xl lg:rounded-2xl overflow-hidden">
              <img
                src={featuredImageNode.sourceUrl || "/placeholder.svg"}
                alt={featuredImageNode.altText || title}
                className="w-full h-auto aspect-video object-cover rounded-xs shadow-none"
                loading="eager"
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
            <CommentList postId={postId} />
          </section>
        )}

        <section className="border-t border-border pt-10 mt-12 lg:mt-1.5 lg:pt-2.5">
          <div className="flex items-center gap-3 mb-2.5">
            <h2 className="text-2xl font-bold text-foreground lg:text-xl">Related Articles</h2>
          </div>

          {relatedPosts.length > 0 ? (
            <ArticleList articles={relatedPosts} layout="compact" showLoadMore={false} />
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
              onClick={() => router.push(`/${sourceCountryCode ?? countryCode}`)}
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
