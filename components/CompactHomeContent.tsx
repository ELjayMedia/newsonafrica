"use client"

import { FeaturedHeroClient as FeaturedHero } from "@/components/client/FeaturedHeroClient"
import { CompactCard } from "@/components/CompactCard"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import Link from "next/link"
import { getCategoryUrl, getCurrentCountry } from "@/lib/utils/routing"
import { useEffect, useState } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import useSWR from "swr"
import ErrorBoundary from "@/components/ErrorBoundary"
import {
  getLatestPostsForCountry,
  getCategoriesForCountry,
  getPostsForCategories,
  getFpTaggedPostsForCountry,
  mapPostsToHomePosts,
} from "@/lib/wordpress-api"
import type { WordPressPost } from "@/lib/wordpress/client"
import { categoryConfigs } from "@/config/homeConfig"
import type { Category } from "@/types/content"
import type { HomePost } from "@/types/home"
import { ChevronRight, TrendingUp } from "lucide-react"

interface CompactHomeContentProps {
  initialPosts?: HomePost[]
  initialData?: {
    taggedPosts: HomePost[]
    featuredPosts: HomePost[]
    categories: Category[]
    recentPosts: HomePost[]
  }
}

const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true
}

const fetchHomeData = async (): Promise<{
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: Category[]
  recentPosts: HomePost[]
}> => {
  try {
    if (!isOnline()) {
      throw new Error("Device is offline")
    }

    const country = getCurrentCountry()

    const results = await Promise.allSettled([
      getFpTaggedPostsForCountry(country, 6),
      getLatestPostsForCountry(country, 10),
      getCategoriesForCountry(country),
    ])

    const taggedPosts =
      results[0].status === "fulfilled" ? results[0].value : ([] as HomePost[])

    const latestPostsResult =
      results[1].status === "fulfilled" ? results[1].value : { posts: [] as any[] }
    const recentPosts = mapPostsToHomePosts(latestPostsResult.posts ?? [], country)

    const categoriesResult =
      results[2].status === "fulfilled" ? results[2].value : { categories: [] }
    const categories = categoriesResult.categories || []

    const featuredPosts =
      taggedPosts.length > 0 ? taggedPosts.slice(0, 6) : recentPosts.slice(0, 6)

    return {
      taggedPosts,
      featuredPosts,
      categories,
      recentPosts,
    }
  } catch (error) {
    console.error("Error fetching home data:", error)
    throw error
  }
}

export function CompactHomeContent({ initialPosts = [], initialData }: CompactHomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [categoryPosts, setCategoryPosts] = useState<Record<string, HomePost[]>>({})

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
    initialData ||
    (initialPosts.length > 0
      ? {
          taggedPosts: initialPosts.slice(0, 6),
          featuredPosts: initialPosts.slice(0, 6),
          categories: [],
          recentPosts: initialPosts.slice(0, 10),
        }
      : {
          taggedPosts: [],
          featuredPosts: [],
          categories: [],
          recentPosts: [],
        })

  const { data, error, isLoading } = useSWR<{
    taggedPosts: HomePost[]
    featuredPosts: HomePost[]
    categories: Category[]
    recentPosts: HomePost[]
  }>("homepage-data", fetchHomeData, {
    fallbackData,
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

      const country = getCurrentCountry()
      const selectedConfigs = categoryConfigs.slice(0, 3)
      const slugs = selectedConfigs.map((config) => config.name.toLowerCase())
      const batchedPosts = await getPostsForCategories(country, slugs, 4)

      const mapped: Record<string, HomePost[]> = {}

      selectedConfigs.forEach((config) => {
        const slug = config.name.toLowerCase()
        const categoryData = batchedPosts[slug]

        if (categoryData?.posts?.length) {
          mapped[config.name] = mapPostsToHomePosts(
            categoryData.posts as WordPressPost[],
            country,
          )
        }
      })

      setCategoryPosts(mapped)
    }

    fetchCategoryPosts()
  }, [isOffline])

  const {
    taggedPosts = [],
    featuredPosts = [],
    categories = [],
    recentPosts = [],
  } = data || fallbackData

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
              <Link href={getCategoryUrl("news") as string} className="text-xs text-blue-600 flex items-center gap-1">
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
                <Link href={getCategoryUrl("news") as string} className="text-xs text-blue-600">
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
                  href={getCategoryUrl(categoryName.toLowerCase())}
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
