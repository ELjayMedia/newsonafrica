"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArticleList } from "@/components/ArticleList"
import { ChevronLeft, ChevronRight, Clock, User, ArrowUp, Eye, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { getRelatedPostsForCountry } from "@/lib/wordpress-api"
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { BookmarkButton } from "@/components/BookmarkButton"

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

  const { data: relatedPosts, isLoading: relatedLoading } = useSWR(
    postId ? `related-${relatedCountry}-${postId}` : null,
    () => getRelatedPostsForCountry(relatedCountry, postId!, 6),
    { fallbackData: [] },
  )

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

  const authorName = initialData?.author?.node?.name ?? initialData?.author?.name ?? null

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-1 bg-muted/30 z-50 backdrop-blur-sm">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-150 ease-out shadow-sm"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article id="article-content" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12" ref={contentRef}>
        <header className="mb-8 lg:mb-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

          <h1 className="font-bold mb-6 lg:mb-8 text-balance leading-tight text-3xl sm:text-4xl lg:text-5xl text-foreground">
            {initialData.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-muted-foreground mb-8 text-sm lg:text-base">
            {authorName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="font-medium">{authorName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>{estimatedReadTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Reading: {Math.round(readingProgress)}%</span>
            </div>
            {postId && (
              <div className="ml-auto">
                <BookmarkButton
                  postId={postId}
                  country={countryCode}
                  title={initialData.title}
                  slug={initialData.slug}
                  excerpt={initialData.excerpt}
                  featuredImage={initialData.featuredImage?.node}
                />
              </div>
            )}
          </div>

          {initialData.featuredImage?.node?.sourceUrl && (
            <figure className="mb-10 lg:mb-12 rounded-xl lg:rounded-2xl overflow-hidden shadow-xl">
              <img
                src={initialData.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={initialData.featuredImage.node.altText || initialData.title}
                className="w-full h-auto aspect-video object-cover"
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
            __html: rewriteLegacyLinks(initialData.content || "", countryCode),
          }}
        />

        <section className="border-t border-border pt-10 lg:pt-12 mt-12 lg:mt-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-1 w-10 bg-primary rounded-full" />
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Related Articles</h2>
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
