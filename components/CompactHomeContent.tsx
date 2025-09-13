"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { CompactCard } from "@/components/CompactCard"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import useSWR from "swr"
import ErrorBoundary from "@/components/ErrorBoundary"
import { getLatestPosts, getCategories, getPostsByCategory } from "@/lib/api/wordpress"
import { categoryConfigs } from "@/config/homeConfig"
import type { Post, Category } from "@/types/content"
import { ChevronRight, TrendingUp } from "lucide-react"

interface CompactHomeContentProps {
  initialPosts?: Post[]
  initialData?: {
    taggedPosts: Post[]
    featuredPosts: Post[]
    categories: Category[]
    recentPosts: Post[]
  }
}

const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true
}

const fetchHomeData = async (): Promise<{
  taggedPosts: Post[]
  featuredPosts: Post[]
  categories: Category[]
  recentPosts: Post[]
}> => {
  try {
    if (!isOnline()) {
      throw new Error("Device is offline")
    }

    const results = await Promise.allSettled([getLatestPosts(50), getCategories()])

    const latestPostsResult = results[0].status === "fulfilled" ? results[0].value : { posts: [] }
    const categoriesResult = results[1].status === "fulfilled" ? results[1].value : { categories: [] }

    const posts = latestPostsResult.posts || []
    const categories = categoriesResult.categories || []

    const fpTaggedPosts = posts.filter((post) =>
      post.tags?.nodes?.some((tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp"),
    )

    return {
      taggedPosts: fpTaggedPosts,
      featuredPosts: posts.slice(0, 6),
      categories: categories,
      recentPosts: posts.slice(0, 10),
    }
  } catch (error) {
    console.error("Error fetching home data:", error)
    throw error
  }
}

export function CompactHomeContent({ initialPosts = [], initialData }: CompactHomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [categoryPosts, setCategoryPosts] = useState<Record<string, Post[]>>({})

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const fallbackData =
    initialPosts.length > 0
      ? {
          taggedPosts: initialPosts.filter((post) =>
            post.tags?.nodes?.some((tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp"),
          ),
          featuredPosts: initialPosts.slice(0, 6),
          categories: [],
          recentPosts: initialPosts.slice(0, 10),
        }
      : {
          taggedPosts: [],
          featuredPosts: [],
          categories: [],
          recentPosts: [],
        }

  const { data, error, isLoading } = useSWR<{
    taggedPosts: Post[]
    featuredPosts: Post[]
    categories: Category[]
    recentPosts: Post[]
  }>("homepage-data", fetchHomeData, {
    fallbackData: initialData || fallbackData,
    revalidateOnMount: !initialData && !initialPosts.length,
    revalidateOnFocus: false,
    refreshInterval: isOffline ? 0 : 300000,
    dedupingInterval: 60000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    shouldRetryOnError: !isOffline,
  })

  useEffect(() => {
    const fetchCategoryPosts = async () => {
      if (isOffline) return

      const categoryPromises = categoryConfigs.slice(0, 3).map(async (config) => {
        try {
          const result = await getPostsByCategory(config.name.toLowerCase(), 4)
          return { name: config.name, posts: result.posts || [] }
        } catch (error) {
          return { name: config.name, posts: [] }
        }
      })

      const results = await Promise.allSettled(categoryPromises)
      const newCategoryPosts: Record<string, Post[]> = {}

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          newCategoryPosts[result.value.name] = result.value.posts
        }
      })

      setCategoryPosts(newCategoryPosts)
    }

    fetchCategoryPosts()
  }, [isOffline])

  const {
    taggedPosts = [],
    featuredPosts = [],
    categories = [],
    recentPosts = [],
  } = data || initialData || fallbackData

  if (isLoading && !initialData && !initialPosts.length) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-2">
              <div className="w-20 h-16 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const mainStory = taggedPosts[0] || featuredPosts[0] || null
  const quickReads = taggedPosts.slice(1, 4) || featuredPosts.slice(1, 4) || []
  const trendingStories = featuredPosts.slice(0, 5) || []

  return (
    <ErrorBoundary>
      <div className="space-y-3 pb-16">
        {/* Compact Hero */}
        {mainStory && (
          <section className="px-2">
            <div className="relative rounded-lg overflow-hidden">
              <FeaturedHero post={mainStory} />
            </div>
          </section>
        )}

        {/* Quick Reads - Horizontal Scroll */}
        {quickReads.length > 0 && (
          <section className="px-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-red-500" />
                Quick Reads
              </h2>
              <Link href="/news" className="text-xs text-blue-600 flex items-center gap-1">
                More <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {quickReads.map((post) => (
                <div key={post.id} className="flex-shrink-0 w-64">
                  <CompactCard post={post} layout="horizontal" />
                </div>
              ))}
            </div>
          </section>
        )}


        {/* Trending Stories - Minimal Layout */}
        {trendingStories.length > 0 && (
          <section className="px-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between p-2 border-b border-gray-100">
                <h2 className="text-sm font-bold">Trending Now</h2>
                <Link href="/news" className="text-xs text-blue-600">
                  View All
                </Link>
              </div>
              <div className="p-2 space-y-1">
                {trendingStories.slice(0, 4).map((post) => (
                  <CompactCard key={post.id} post={post} layout="minimal" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Category Sections - Collapsible */}
        <div className="px-2 space-y-2">
          {Object.entries(categoryPosts).map(([categoryName, posts]) => {
            if (posts.length === 0) return null

            return (
              <CollapsibleSection
                key={categoryName}
                title={categoryName}
                compact
                defaultOpen={categoryName === "Business"}
              >
                <div className="space-y-1">
                  {posts.slice(0, 3).map((post) => (
                    <CompactCard key={post.id} post={post} layout="minimal" />
                  ))}
                </div>
                <Link
                  href={`/category/${categoryName.toLowerCase()}`}
                  className="block text-center text-xs text-blue-600 mt-2 py-1 border-t border-gray-100"
                >
                  View all {categoryName} news
                </Link>
              </CollapsibleSection>
            )
          })}
        </div>
      </div>
    </ErrorBoundary>
  )
}
