"use client"

import useSWR from "swr"
import { fetchRecentPosts, fetchMostReadPosts } from "@/lib/wordpress-api"
import { getCurrentCountry } from "@/lib/utils/routing"
import Link from "next/link"
import Image from "next/image"
import { Clock, AlertCircle, RefreshCw } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useMemo, useCallback } from "react"
import { getArticleUrl } from "@/lib/utils/routing"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { Button } from "@/components/ui/button"

export function SidebarContent() {
  const country = getCurrentCountry()
  const { preferences } = useUserPreferences()

  const preferredSections = useMemo(
    () => preferences.sections.map((section) => section.toLowerCase()),
    [preferences.sections],
  )

  const {
    data: recentData,
    error: recentError,
    isLoading: isRecentLoading,
    mutate: mutateRecent,
  } = useSWR(["recentPosts", country], () => fetchRecentPosts(10, country), {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 1000 * 60 * 5, // 5 minutes
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  })

  const {
    data: mostReadData,
    error: mostReadError,
    isLoading: isMostReadLoading,
    mutate: mutateMostRead,
  } = useSWR(["mostRead", country], () => fetchMostReadPosts(country), {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 1000 * 60 * 5, // 5 minutes
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  })

  const personalizedPosts = useMemo(() => {
    if (!recentData || !Array.isArray(recentData)) {
      return []
    }

    if (!preferredSections.length) {
      return recentData
    }

    const matches = recentData.filter((post) => {
      const categories = post.categories?.nodes || []
      return categories.some((category: any) => {
        const slug = (category?.slug || category?.name || "").toLowerCase()
        return slug && preferredSections.includes(slug)
      })
    })

    return matches.length > 0 ? matches : recentData
  }, [recentData, preferredSections])

  const mostReadPosts = useMemo(() => (Array.isArray(mostReadData) ? mostReadData : []), [mostReadData])

  const handleRetry = useCallback(() => {
    mutateRecent()
    mutateMostRead()
  }, [mutateRecent, mutateMostRead])

  if (isRecentLoading || isMostReadLoading) {
    return <SidebarSkeleton />
  }

  if (recentError || mostReadError) {
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
          <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200">Most Read</h2>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-2">No articles available</p>
            <p className="text-gray-400 text-xs">Check back soon for updates</p>
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
          <section className="bg-white shadow-sm rounded-lg p-4 border border-gray-100 transition-shadow hover:shadow-md">
            <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200">Most Read</h2>
            <div className="space-y-3">
              {mostReadPosts.map((post, index) => (
                <Link
                  key={post.id}
                  href={getArticleUrl(post.slug)}
                  className="flex items-start gap-3 group transition-colors hover:bg-gray-50 p-2 -mx-2 rounded"
                >
                  <span className="text-2xl font-light text-gray-300 leading-tight min-w-[1.5rem]">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors line-clamp-3">
                      {post.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {personalizedPosts.length > 0 && (
          <section className="bg-white shadow-sm rounded-lg p-4 border border-gray-100 transition-shadow hover:shadow-md">
            <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200">
              {preferredSections.length > 0 ? "For You" : "Latest News"}
            </h2>
            <div className="space-y-3">
              {personalizedPosts.slice(0, 5).map((post) => (
                <Link
                  key={post.id}
                  href={getArticleUrl(post.slug)}
                  className="flex items-start gap-3 group transition-colors hover:bg-gray-50 p-2 -mx-2 rounded"
                >
                  {post.featuredImage?.node?.sourceUrl && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      <Image
                        src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                        alt={post.featuredImage.node.altText || post.title}
                        fill
                        sizes="80px"
                        className="object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
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
