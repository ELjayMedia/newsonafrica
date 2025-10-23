"use client"

import { getCurrentCountry } from "@/lib/utils/routing"
import Link from "next/link"
import Image from "next/image"
import { Clock, AlertCircle, RefreshCw, TrendingUp } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useMemo, useCallback } from "react"
import { getArticleUrl } from "@/lib/utils/routing"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { Button } from "@/components/ui/button"
import { useSidebarContent } from "@/hooks/useSidebarContent"
import type { SidebarContentPayload } from "@/types/sidebar"

interface SidebarContentProps {
  initialData?: SidebarContentPayload
  country?: string
}

export function SidebarContent({ initialData, country: initialCountry }: SidebarContentProps = {}) {
  const country = initialCountry ?? getCurrentCountry()
  const { preferences } = useUserPreferences()

  const preferredSections = useMemo(
    () => preferences.sections.map((section) => section.toLowerCase()),
    [preferences.sections],
  )

  const { data, error, isLoading, mutate } = useSidebarContent(country, initialData)

  const payload = data ?? initialData
  const rawRecentPosts = payload?.recent
  const rawMostReadPosts = payload?.mostRead
  const recentPosts = useMemo(
    () => (Array.isArray(rawRecentPosts) ? rawRecentPosts : []),
    [rawRecentPosts],
  )
  const mostReadPosts = useMemo(
    () => (Array.isArray(rawMostReadPosts) ? rawMostReadPosts : []),
    [rawMostReadPosts],
  )

  const initialRecentCount = Array.isArray(initialData?.recent) ? initialData.recent.length : 0
  const initialMostReadCount = Array.isArray(initialData?.mostRead) ? initialData.mostRead.length : 0
  const hasInitialContent = initialRecentCount + initialMostReadCount > 0

  const personalizedPosts = useMemo(() => {
    if (!recentPosts.length) {
      return []
    }

    if (!preferredSections.length) {
      return recentPosts
    }

    const matches = recentPosts.filter((post) => {
      const categories = post.categories?.nodes || []
      return categories.some((category: any) => {
        const slug = (category?.slug || category?.name || "").toLowerCase()
        return slug && preferredSections.includes(slug)
      })
    })

    return matches.length > 0 ? matches : recentPosts
  }, [recentPosts, preferredSections])

  const handleRetry = useCallback(() => {
    mutate()
  }, [mutate])

  if (isLoading && !hasInitialContent) {
    return <SidebarSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-800 mb-1">Unable to load content</h3>
              <p className="text-sm text-red-700 mb-3">
                We're having trouble loading the sidebar content. This might be a temporary issue.
              </p>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="text-red-700 border-red-300 hover:bg-red-100 bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (personalizedPosts.length === 0 && mostReadPosts.length === 0) {
    return (
      <div className="space-y-6">
        <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
            <TrendingUp className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-bold">Most Read</h2>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-2">No articles available</p>
            <p className="text-gray-400 text-xs">Check back soon for trending stories</p>
          </div>
        </section>

        <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200">Latest News</h2>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-2">No articles available</p>
            <p className="text-gray-400 text-xs">Check back soon for updates</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {mostReadPosts.length > 0 && (
          <section className="bg-white shadow-sm rounded-lg p-5 border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b-2 border-gray-200">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Most Read</h2>
            </div>
            <div className="space-y-4">
              {mostReadPosts.map((post, index) => {
                const rankColors = [
                  "from-yellow-400 to-yellow-600", // 1st place - gold
                  "from-gray-300 to-gray-500", // 2nd place - silver
                  "from-orange-400 to-orange-600", // 3rd place - bronze
                ]
                const isTopThree = index < 3
                const rankBgClass = isTopThree ? rankColors[index] : "from-gray-200 to-gray-300"

                return (
                  <Link
                    key={post.id}
                    href={getArticleUrl(post.slug, country)}
                    className="flex items-start gap-3 group transition-all hover:bg-gray-50 p-2.5 -mx-2.5 rounded-lg"
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${rankBgClass} flex items-center justify-center shadow-sm ${
                        isTopThree ? "ring-2 ring-offset-1 ring-gray-200" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${isTopThree ? "text-white" : "text-gray-600"}`}
                        aria-label={`Rank ${index + 1}`}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors line-clamp-3 mb-1">
                        {post.title}
                      </h3>
                      {post.date && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <time dateTime={post.date} className="truncate">
                            {new Date(post.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">Updated every 3 minutes</p>
            </div>
          </section>
        )}

        {personalizedPosts.length > 0 && (
          <section className="bg-white shadow-sm rounded-lg p-5 border border-gray-100 transition-all hover:shadow-md">
            <h2 className="text-lg font-bold mb-5 pb-3 border-b-2 border-gray-200 text-gray-900">
              {preferredSections.length > 0 ? "For You" : "Latest News"}
            </h2>
            <div className="space-y-4">
              {personalizedPosts.slice(0, 5).map((post) => (
                <Link
                  key={post.id}
                  href={getArticleUrl(post.slug, country)}
                  className="flex items-start gap-3 group transition-all hover:bg-gray-50 p-2.5 -mx-2.5 rounded-lg"
                >
                  {post.featuredImage?.node?.sourceUrl && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                      <Image
                        src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                        alt={post.featuredImage.node.altText || post.title}
                        fill
                        sizes="80px"
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1.5">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <time dateTime={post.date} className="truncate">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </ErrorBoundary>
  )
}
