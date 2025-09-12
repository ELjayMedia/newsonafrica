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
import { getRelatedPostsForCountry } from "@/lib/api/wordpress"

interface ArticleClientContentProps {
  slug: string
  countryCode: string
  initialData: any
}

export function ArticleClientContent({ slug, countryCode, initialData }: ArticleClientContentProps) {
  const [readingProgress, setReadingProgress] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [estimatedReadTime, setEstimatedReadTime] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { data: relatedPosts, isLoading: relatedLoading } = useSWR(
    `related-${countryCode}-${slug}`,
    () => getRelatedPostsForCountry(countryCode, slug, 6),
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

  useEffect(() => {
    const bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]")
    setIsBookmarked(bookmarks.includes(slug))
  }, [slug])

  const handleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]")
    let newBookmarks

    if (isBookmarked) {
      newBookmarks = bookmarks.filter((id: string) => id !== slug)
    } else {
      newBookmarks = [...bookmarks, slug]
    }

    localStorage.setItem("bookmarks", JSON.stringify(newBookmarks))
    setIsBookmarked(!isBookmarked)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-1 bg-muted/30 z-50 backdrop-blur-sm">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-150 ease-out shadow-sm"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8" ref={contentRef}>
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              {initialData.categories?.nodes?.map((category: any) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(initialData.date))} ago</span>
            </div>
          </div>

          <h1 className="font-bold mb-6 text-balance leading-tight text-3xl text-left">{initialData.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium">{initialData.author.node.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{estimatedReadTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>Reading progress: {Math.round(readingProgress)}%</span>
            </div>
          </div>

          {/* Featured image with better aspect ratio */}
          {initialData.featuredImage?.node?.sourceUrl && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
              <img
                src={initialData.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={initialData.featuredImage.node.altText || initialData.title}
                className="w-full h-auto aspect-video object-cover"
                loading="eager"
              />
            </div>
          )}
        </header>

        <div
          className="prose prose-lg prose-gray max-w-none mb-12 
                     prose-headings:font-bold prose-headings:text-foreground
                     prose-p:text-foreground prose-p:leading-relaxed
                     prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                     prose-img:rounded-lg prose-img:shadow-md
                     prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-lg
                     prose-code:bg-muted prose-code:px-1 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: initialData.content }}
        />

        <section className="border-t pt-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-primary rounded-full" />
            <h2 className="text-2xl font-bold">Related Articles</h2>
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
            <div className="text-center py-8 text-muted-foreground">
              <p>No related articles found.</p>
            </div>
          )}
        </section>
      </article>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Scroll to top button */}
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

        {/* Navigation controls */}
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
