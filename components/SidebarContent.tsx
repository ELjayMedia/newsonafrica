"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Clock, TrendingUp } from "lucide-react"

import ErrorBoundary from "@/components/ErrorBoundary"
import { getArticleUrl, getCurrentCountry } from "@/lib/utils/routing"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"
import type { SidebarContentPayload } from "@/types/sidebar"

interface SidebarContentProps {
  data?: SidebarContentPayload
  country?: string
}

const normalizePosts = (value: unknown): SidebarContentPayload["recent"] =>
  Array.isArray(value) ? (value as SidebarContentPayload["recent"]) : []

const buildPayload = (data?: SidebarContentPayload): SidebarContentPayload => ({
  recent: normalizePosts(data?.recent),
  mostRead: normalizePosts(data?.mostRead),
})

export function SidebarContent({ data, country: providedCountry }: SidebarContentProps = {}) {
  const country = (providedCountry ?? getCurrentCountry()).toLowerCase()
  const { preferences } = useUserPreferences()

  const payload = useMemo(() => buildPayload(data), [data])
  const recentPosts = payload.recent
  const mostReadPosts = payload.mostRead

  const preferredSections = useMemo(
    () => preferences.sections.map((section) => section.toLowerCase()),
    [preferences.sections],
  )

  const personalizedPosts = useMemo(() => {
    if (!recentPosts.length) {
      return []
    }

    if (!preferredSections.length) {
      return recentPosts
    }

    const matches = recentPosts.filter((post: any) => {
      const categories = post?.categories?.nodes || []
      return categories.some((category: any) => {
        const slug = (category?.slug || category?.name || "").toLowerCase()
        return slug && preferredSections.includes(slug)
      })
    })

    return matches.length > 0 ? matches : recentPosts
  }, [recentPosts, preferredSections])

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
              {mostReadPosts.map((post: any, index: number) => {
                const rankColors = [
                  "from-yellow-400 to-yellow-600",
                  "from-gray-300 to-gray-500",
                  "from-orange-400 to-orange-600",
                ]
                const isTopThree = index < 3
                const rankBgClass = isTopThree ? rankColors[index] : "from-gray-200 to-gray-300"

                return (
                  <Link
                    key={post.id ?? `${post.slug}-${index}`}
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
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-blue-600">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{post.excerpt}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        <time dateTime={post.date}>{new Date(post.date).toLocaleDateString()}</time>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {personalizedPosts.length > 0 && (
          <section className="bg-white shadow-sm rounded-lg p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Latest News</h2>
                <p className="text-xs text-gray-500">Personalized for you</p>
              </div>
            </div>
            <div className="space-y-4">
              {personalizedPosts.map((post: any, index: number) => (
                <Link
                  key={post.id ?? `${post.slug}-${index}`}
                  href={getArticleUrl(post.slug, country)}
                  className="flex items-start gap-3 group"
                >
                  {post.featuredImage?.node?.sourceUrl ? (
                    <div className="flex-shrink-0 relative w-20 h-16 rounded-md overflow-hidden">
                      <Image
                        src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                        alt={post.featuredImage.node.altText || post.title || "Article thumbnail"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-20 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                      <span className="text-xs font-medium">NOA</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-blue-600">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <time dateTime={post.date}>{new Date(post.date).toLocaleDateString()}</time>
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
