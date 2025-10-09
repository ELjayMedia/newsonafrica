"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArticleList } from "@/components/ArticleList"
import { CommentList } from "@/components/CommentList"
import { BookmarkButton } from "@/components/BookmarkButton"
import { ShareButtons } from "@/components/ShareButtons"
import { ChevronLeft, ChevronRight, Clock, User, ArrowUp, Eye, Calendar, Gift } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { getRelatedPostsForCountry } from "@/lib/wordpress-api"
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"
import { transformWordPressEmbeds } from "@/lib/utils/wordpressEmbeds"

interface ArticleClientContentProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
}

export function ArticleClientContent({ slug, countryCode, sourceCountryCode, initialData }: ArticleClientContentProps) {
  const [readingProgress, setReadingProgress] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [estimatedReadTime, setEstimatedReadTime] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const postId = initialData?.id != null ? String(initialData.id) : undefined

  const relatedCountry = sourceCountryCode ?? countryCode

  const {
    data: relatedPosts = [],
    isLoading: relatedLoading,
    error: relatedError,
    mutate: mutateRelatedPosts,
  } = useSWR(
    postId ? `related-${relatedCountry}-${postId}` : null,
    () => getRelatedPostsForCountry(relatedCountry, postId!, 6),
    { fallbackData: [] },
  )

  const shareUrl = `/${countryCode}/article/${slug}`

  const handleRetryRelatedPosts = () => {
    void mutateRelatedPosts()
  }

  useEffect(() => {
    const calculateReadTime = () => {
      if (!contentRef.current) return
      const text = contentRef.current.textContent || ""
      const wordsPerMinute = 200
      const wordCount = text.split(/\s+/).length
      setEstimatedReadTime(Math.ceil(wordCount / wordsPerMinute))
    }

    const handleScroll = () => {
      if (!contentRef.current) return

      const element = contentRef.current
      const scrollTop = window.scrollY
      const scrollHeight = element.scrollHeight - window.innerHeight
      const progress = Math.min(Math.max((scrollTop / scrollHeight) * 100, 0), 100)

      setReadingProgress(progress)
      setShowScrollTop(scrollTop > 500)
    }

    calculateReadTime()
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

  const authorName = initialData?.author?.node?.name ?? initialData?.author?.name ?? null
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

  const sanitizedHtml = sanitizeArticleHtml(
    rewriteLegacyLinks(initialData.content ?? "", countryCode),
  )

  const articleHtml = transformWordPressEmbeds(sanitizedHtml)

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-1 bg-muted/30 z-50 backdrop-blur-sm">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-150 ease-out shadow-sm"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article id="article-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:px-0 lg:py-0" ref={contentRef}>
        <header className="flex flex-wrap items-center gap-2.5 md:gap-3.5 text-sm md:text-base text-muted-foreground mb-2.5 rounded-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
            <div className="flex flex-wrap gap-2">
              {initialData.categories?.nodes?.map((category: any) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                >
                  {category.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              <time dateTime={initialData.date}>{formatDistanceToNow(new Date(initialData.date))} ago</time>
            </div>
          </div>

          <h1 className="font-bold mb-6 text-balance leading-tight text-3xl text-foreground sm:text-3xl text-left tracking-tight leading-4 lg:mb-3 mt-1.5">
            {initialData.title}
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
              title={initialData?.title ?? ""}
              url={shareUrl}
              description={initialData?.excerpt ?? initialData?.title ?? ""}
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
                title={initialData?.title}
                featuredImage={heroImage}
                variant="outline"
                size="sm"
                className="flex items-center"
              />
            )}
          </div>

          {initialData.featuredImage?.node?.sourceUrl && (
            <figure className="mb-10 lg:mb-12 rounded-xl lg:rounded-2xl overflow-hidden">
              <img
                src={initialData.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={initialData.featuredImage.node.altText || initialData.title}
                className="w-full h-auto aspect-video object-cover rounded-xs shadow-none"
                loading="eager"
              />
              {initialData.featuredImage.node.caption && (
                <figcaption className="text-sm text-muted-foreground text-center mt-3 px-4">
                  {initialData.featuredImage.node.caption}
                </figcaption>
              )}
            </figure>
          )}
        </header>

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
            __html: articleHtml,
          }}
        />

        {postId && (
          <section id="comments" className="border-t border-border pt-10 mt-12 lg:mt-1.5 lg:pt-2.5">
            <CommentList postId={postId} />
          </section>
        )}

        <section className="border-t border-border pt-10 mt-12 lg:mt-1.5 lg:pt-2.5">
          <div className="flex items-center gap-3 mb-2.5">
            <h2 className="text-2xl font-bold text-foreground lg:text-xl">Related Articles</h2>
          </div>

          {relatedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : relatedError ? (
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-destructive">Failed to load related articles.</p>
              <p className="mt-2 text-sm text-muted-foreground">Please check your connection and try again.</p>
              <Button className="mt-6 bg-transparent" onClick={handleRetryRelatedPosts} variant="outline">
                Retry
              </Button>
            </div>
          ) : relatedPosts.length > 0 ? (
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
              onClick={() => router.push(`/${countryCode}`)}
              className="p-3 hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Go to country page"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-20 left-4 md:hidden z-40">
        <Card className="px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-150" style={{ width: `${readingProgress}%` }} />
            </div>
            <span>{Math.round(readingProgress)}%</span>
          </div>
        </Card>
      </div>
    </>
  )
}
