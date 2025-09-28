"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArticleList } from "@/components/ArticleList"
import { ChevronLeft, ChevronRight, Clock, User, ArrowUp, Eye, Calendar, Share2, Bookmark, Heart } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { getRelatedPostsForCountry } from "@/lib/wordpress-api"
import { rewriteLegacyLinks } from "@/lib/utils/routing"

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
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const postId = initialData?.id != null ? String(initialData.id) : undefined

  const { data: relatedPosts, isLoading: relatedLoading } = useSWR(
    postId ? `related-${countryCode}-${postId}` : null,
    () => getRelatedPostsForCountry(countryCode, postId!, 6),
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

    const likes = JSON.parse(localStorage.getItem("likes") || "{}")
    setIsLiked(likes[slug] || false)
    setLikeCount(Math.floor(Math.random() * 50) + 10) // Simulated like count
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

  const handleLike = () => {
    const likes = JSON.parse(localStorage.getItem("likes") || "{}")
    const newLiked = !isLiked

    likes[slug] = newLiked
    localStorage.setItem("likes", JSON.stringify(likes))
    setIsLiked(newLiked)
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1))
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: initialData.title.rendered,
          url: window.location.href,
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-50 to-orange-50 z-50 backdrop-blur-sm">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 transition-all duration-150 ease-out shadow-sm"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8" ref={contentRef}>
        <header className="mb-12">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div className="flex flex-wrap gap-2">
              {initialData.categories?.nodes?.map((category: any) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200 hover:from-amber-100 hover:to-orange-100 transition-all duration-200 font-medium"
                >
                  {category.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 text-stone-600 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(initialData.date))} ago</span>
            </div>
          </div>

          <h1 className="font-serif font-bold mb-8 text-balance leading-tight text-4xl md:text-5xl text-stone-900 tracking-tight">
            {initialData.title.rendered}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-stone-600 mb-8 text-sm">
            {initialData.author?.node?.name && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-amber-700" />
                </div>
                <span className="font-medium text-stone-800">{initialData.author.node.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{estimatedReadTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600" />
              <span>Reading: {Math.round(readingProgress)}%</span>
            </div>
          </div>

          {initialData.featuredImage?.node?.sourceUrl && (
            <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-1">
              <img
                src={initialData.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={initialData.featuredImage.node.altText || initialData.title.rendered}
                className="w-full h-auto aspect-video object-cover rounded-xl"
                loading="eager"
              />
            </div>
          )}

          <div className="flex items-center justify-between py-6 border-y border-stone-200">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  isLiked
                    ? "text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
                    : "text-stone-600 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                <span className="font-medium">{likeCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  isBookmarked
                    ? "text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100"
                    : "text-stone-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                <span className="font-medium">Save</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2 text-stone-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
              >
                <Share2 className="w-4 h-4" />
                <span className="font-medium">Share</span>
              </Button>
            </div>
          </div>
        </header>

        <div
          className="prose prose-xl prose-stone max-w-none mb-16
                     prose-headings:font-serif prose-headings:font-bold prose-headings:text-stone-900 prose-headings:tracking-tight
                     prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                     prose-p:text-stone-700 prose-p:leading-relaxed prose-p:text-lg prose-p:mb-6
                     prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                     prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                     prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:bg-gradient-to-r prose-blockquote:from-amber-50 prose-blockquote:to-orange-50 prose-blockquote:rounded-r-xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:my-8
                     prose-code:bg-stone-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-stone-800
                     prose-strong:text-stone-900 prose-strong:font-semibold
                     prose-em:text-stone-700 prose-em:italic"
          dangerouslySetInnerHTML={{
            __html: rewriteLegacyLinks(initialData.content?.rendered || "", countryCode),
          }}
        />

        <section className="border-t border-stone-200 pt-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-1 w-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
            <h2 className="text-3xl font-serif font-bold text-stone-900">Related Stories</h2>
          </div>

          {relatedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-stone-200">
                  <Skeleton className="w-full h-48 bg-gradient-to-r from-stone-200 to-stone-300" />
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-3/4 mb-3 bg-gradient-to-r from-stone-200 to-stone-300" />
                    <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-stone-200 to-stone-300" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : relatedPosts.length > 0 ? (
            <ArticleList articles={relatedPosts} layout="compact" showLoadMore={false} />
          ) : (
            <div className="text-center py-12 text-stone-600">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
                <Eye className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-lg font-medium">No related articles found.</p>
              <p className="text-sm mt-2">Check back soon for more stories from {countryCode.toUpperCase()}.</p>
            </div>
          )}
        </section>
      </article>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {showScrollTop && (
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-stone-200 bg-white/95 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="p-3 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 transition-all duration-200"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          </Card>
        )}

        <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-stone-200 bg-white/95 backdrop-blur-sm">
          <div className="flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-3 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 transition-all duration-200 border-r border-stone-200"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${countryCode}`)}
              className="p-3 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 transition-all duration-200"
              aria-label="Go to country page"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-20 left-4 md:hidden z-40">
        <Card className="px-4 py-3 shadow-xl border-stone-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-sm text-stone-600">
            <div className="w-16 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150 rounded-full"
                style={{ width: `${readingProgress}%` }}
              />
            </div>
            <span className="font-medium">{Math.round(readingProgress)}%</span>
          </div>
        </Card>
      </div>
    </>
  )
}
