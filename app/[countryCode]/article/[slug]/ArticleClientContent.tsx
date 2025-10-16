"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArticleList } from "@/components/ArticleList"
import { ArticleBody } from "@/components/article/ArticleBody"
import { CommentList } from "@/components/CommentList"
import { BookmarkButton } from "@/components/BookmarkButton"
import { ShareButtons } from "@/components/ShareButtons"
import { ChevronLeft, ChevronRight, User, ArrowUp, Calendar, Gift } from "lucide-react"
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
  const [showScrollTop, setShowScrollTop] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const postId = initialData?.id != null ? String(initialData.id) : undefined

  const relatedCountry = sourceCountryCode ?? countryCode

  const {
    data: relatedPostsData,
    isLoading: relatedLoading,
    isValidating: relatedValidating,
    error: relatedError,
    mutate: mutateRelatedPosts,
  } = useSWR(
    postId ? `related-${relatedCountry}-${postId}` : null,
    () => getRelatedPostsForCountry(relatedCountry, postId!, 6),
  )

  const relatedPosts = relatedPostsData ?? []
  const isFetchingRelated = relatedLoading || relatedValidating

  const shareUrl = `/${countryCode}/article/${slug}`

  const handleRetryRelatedPosts = () => {
    void mutateRelatedPosts()
  }

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

  const articleHtml = useMemo(() => {
    const rewrittenHtml = rewriteLegacyLinks(initialData.content ?? "", countryCode)
    const sanitizedHtml = sanitizeArticleHtml(rewrittenHtml)

    return transformWordPressEmbeds(sanitizedHtml)
  }, [initialData?.content, countryCode])

  return (
    <>
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

        <ArticleBody html={articleHtml} className="mb-12 lg:mb-16" />

        {postId && (
          <section id="comments" className="border-t border-border pt-10 mt-12 lg:mt-1.5 lg:pt-2.5">
            <CommentList postId={postId} />
          </section>
        )}

        <section className="border-t border-border pt-10 mt-12 lg:mt-1.5 lg:pt-2.5">
          <div className="flex items-center gap-3 mb-2.5">
            <h2 className="text-2xl font-bold text-foreground lg:text-xl">Related Articles</h2>
          </div>

          {isFetchingRelated ? (
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

    </>
  )
}
