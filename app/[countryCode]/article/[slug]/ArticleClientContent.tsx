"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArticleList } from "@/components/ArticleList"
import { Share, Bookmark, ChevronLeft, ChevronRight, Clock, User } from "lucide-react"
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
  const [showShareMenu, setShowShareMenu] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { data: relatedPosts, isLoading: relatedLoading } = useSWR(
    `related-${countryCode}-${slug}`,
    () => getRelatedPostsForCountry(countryCode, slug, 6),
    { fallbackData: [] },
  )

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return

      const element = contentRef.current
      const scrollTop = window.scrollY
      const scrollHeight = element.scrollHeight - window.innerHeight
      const progress = Math.min((scrollTop / scrollHeight) * 100, 100)

      setReadingProgress(progress)
    }

    window.addEventListener("scroll", handleScroll)
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

  const handleShare = async (platform?: string) => {
    const url = `https://newsonafrica.com/${countryCode}/article/${slug}`
    const title = initialData.title

    if (platform === "native" && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        console.log("Native share cancelled")
      }
    }

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    }

    if (platform && shareUrls[platform as keyof typeof shareUrls]) {
      window.open(shareUrls[platform as keyof typeof shareUrls], "_blank", "width=600,height=400")
    } else {
      // Copy to clipboard fallback
      await navigator.clipboard.writeText(url)
      alert("Link copied to clipboard!")
    }

    setShowShareMenu(false)
  }

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8" ref={contentRef}>
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {initialData.categories?.nodes?.map((category: any) => (
              <Badge key={category.id} variant="secondary">
                {category.name}
              </Badge>
            ))}
          </div>

          <h1 className="text-4xl font-bold mb-4 text-balance">{initialData.title}</h1>

          <div className="flex items-center gap-4 text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{initialData.author.node.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(initialData.date))} ago</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowShareMenu(!showShareMenu)} className="gap-2">
                <Share className="w-4 h-4" />
                Share
              </Button>

              {showShareMenu && (
                <Card className="absolute top-full mt-2 p-3 z-10 min-w-48">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare("twitter")}
                      className="w-full justify-start"
                    >
                      Share on Twitter
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare("facebook")}
                      className="w-full justify-start"
                    >
                      Share on Facebook
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare("linkedin")}
                      className="w-full justify-start"
                    >
                      Share on LinkedIn
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare("whatsapp")}
                      className="w-full justify-start"
                    >
                      Share on WhatsApp
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleShare()} className="w-full justify-start">
                      Copy Link
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            <Button variant={isBookmarked ? "default" : "outline"} size="sm" onClick={handleBookmark} className="gap-2">
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
              {isBookmarked ? "Saved" : "Save"}
            </Button>
          </div>

          {/* Featured image */}
          {initialData.featuredImage?.node?.sourceUrl && (
            <div className="mb-8">
              <img
                src={initialData.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={initialData.featuredImage.node.altText || initialData.title}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </header>

        <div className="prose prose-lg max-w-none mb-12" dangerouslySetInnerHTML={{ __html: initialData.content }} />

        <section className="border-t pt-8">
          <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
          {relatedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="w-full h-48 mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : (
            <ArticleList articles={relatedPosts} layout="compact" showLoadMore={false} />
          )}
        </section>
      </article>

      <div className="fixed bottom-6 right-6 flex gap-3 z-40">
        <Card className="p-3 shadow-lg">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Card>

        <Card className="p-3 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            Top
          </Button>
        </Card>
      </div>
    </>
  )
}
