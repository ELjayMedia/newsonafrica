"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ArrowUp } from "lucide-react"
import { useRouter } from "next/navigation"

interface ArticleNavigationProps {
  countryCode: string
  currentSlug: string
  previousArticle?: {
    slug: string
    title: string
  }
  nextArticle?: {
    slug: string
    title: string
  }
}

export function ArticleNavigation({ countryCode, currentSlug, previousArticle, nextArticle }: ArticleNavigationProps) {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const router = useRouter()

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

  return (
    <>
      {/* Desktop sticky navigation */}
      <div className="hidden md:block fixed top-1/2 right-6 transform -translate-y-1/2 z-40">
        <Card className="p-2 shadow-lg space-y-2">
          {previousArticle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${countryCode}/article/${previousArticle.slug}`)}
              className="w-full justify-start text-xs p-2 h-auto"
              title={`Previous: ${previousArticle.title}`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="truncate max-w-20">Prev</span>
            </Button>
          )}

          {showScrollTop && (
            <Button variant="ghost" size="sm" onClick={scrollToTop} className="w-full p-2" title="Scroll to top">
              <ArrowUp className="w-4 h-4" />
            </Button>
          )}

          {nextArticle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${countryCode}/article/${nextArticle.slug}`)}
              className="w-full justify-start text-xs p-2 h-auto"
              title={`Next: ${nextArticle.title}`}
            >
              <span className="truncate max-w-20">Next</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </Card>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
        <Card className="p-3 shadow-lg">
          <div className="flex items-center justify-between">
            {previousArticle ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${countryCode}/article/${previousArticle.slug}`)}
                className="flex-1 justify-start text-xs"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="truncate">Previous</span>
              </Button>
            ) : (
              <div className="flex-1" />
            )}

            {showScrollTop && (
              <Button variant="ghost" size="sm" onClick={scrollToTop} className="mx-2">
                <ArrowUp className="w-4 h-4" />
              </Button>
            )}

            {nextArticle ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${countryCode}/article/${nextArticle.slug}`)}
                className="flex-1 justify-end text-xs"
              >
                <span className="truncate">Next</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
