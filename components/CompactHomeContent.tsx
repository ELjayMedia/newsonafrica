"use client"

import { FeaturedHeroClient as FeaturedHero } from "@/components/client/FeaturedHeroClient"
import { CompactCard } from "@/components/CompactCard"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import Link from "next/link"
import { getCategoryUrl, getCurrentCountry } from "@/lib/utils/routing"
import { useEffect, useMemo, useState } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import useSWR from "swr"
import ErrorBoundary from "@/components/ErrorBoundary"
import { categoryConfigs, type CategoryConfig } from "@/config/homeConfig"
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
    categoryPosts?: Record<string, HomePost[]>
  }
}

const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true
}

type HomepageApiResponse = {
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: Category[]
  recentPosts: HomePost[]
  categoryPosts?: Record<string, HomePost[]>
}

type FetchHomeDataOptions = {
  country: string
  categorySlugs?: string[]
  categoryLimit?: number
}

const CATEGORY_POST_LIMIT = 4

const fetchHomeData = async ({
  country,
  categorySlugs,
  categoryLimit,
}: FetchHomeDataOptions): Promise<HomepageApiResponse> => {
  try {
    if (!isOnline()) {
      throw new Error("Device is offline")
    }

    const params = new URLSearchParams({ country })

    if (categorySlugs?.length) {
      params.set("categories", categorySlugs.join(","))
    }

    if (categoryLimit) {
      params.set("categoryLimit", String(categoryLimit))
    }

    const response = await fetch(`/api/homepage-data?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch homepage data: ${response.status}`)
    }

    return (await response.json()) as HomepageApiResponse
  } catch (error) {
    console.error("Error fetching home data:", error)
    throw error
  }
}

const mapCategoryPostsForConfigs = (
  configs: CategoryConfig[],
  categoryPostsBySlug?: Record<string, HomePost[]> | undefined,
): Record<string, HomePost[]> => {
  if (!categoryPostsBySlug) {
    return {}
  }

  return configs.reduce<Record<string, HomePost[]>>((acc, config) => {
    const slug = config.name.toLowerCase()
    const posts = categoryPostsBySlug[slug] ?? categoryPostsBySlug[config.name]

    if (posts?.length) {
      acc[config.name] = posts
    }

    return acc
  }, {})
}

export function CompactHomeContent({ initialPosts = [], initialData }: CompactHomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isOffline, setIsOffline] = useState(!isOnline())
  const selectedConfigs = useMemo(() => categoryConfigs.slice(0, 3), [])
  const [categoryPosts, setCategoryPosts] = useState<Record<string, HomePost[]>>(() =>
    mapCategoryPostsForConfigs(selectedConfigs, initialData?.categoryPosts),
  )
  const currentCountry = getCurrentCountry()
  const categorySlugs = useMemo(
    () => selectedConfigs.map((config) => config.name.toLowerCase()),
    [selectedConfigs],
  )

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

  const fallbackData: HomepageApiResponse = initialData
    ? {
        taggedPosts: initialData.taggedPosts,
        featuredPosts: initialData.featuredPosts,
        categories: initialData.categories,
        recentPosts: initialData.recentPosts,
        categoryPosts: initialData.categoryPosts ?? {},
      }
    : initialPosts.length > 0
      ? {
          taggedPosts: initialPosts.slice(0, 6),
          featuredPosts: initialPosts.slice(0, 6),
          categories: [],
          recentPosts: initialPosts.slice(0, 10),
          categoryPosts: {},
        }
      : {
          taggedPosts: [],
          featuredPosts: [],
          categories: [],
          recentPosts: [],
          categoryPosts: {},
        }

  const { data, error, isLoading } = useSWR<HomepageApiResponse>(
    ["/homepage-data", currentCountry, categorySlugs.join(","), String(CATEGORY_POST_LIMIT)],
    ([_, country]) =>
      fetchHomeData({
        country,
        categorySlugs,
        categoryLimit: CATEGORY_POST_LIMIT,
      }),
    {
      fallbackData,
      revalidateOnMount: !initialData && !initialPosts.length,
      revalidateOnFocus: false,
      refreshInterval: isOffline ? 0 : 300000,
      dedupingInterval: 60000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      shouldRetryOnError: !isOffline,
    },
  )

  useEffect(() => {
    let isCancelled = false

    const updateCategoryPosts = async () => {
      if (isOffline) return

      if (data?.categoryPosts) {
        setCategoryPosts(mapCategoryPostsForConfigs(selectedConfigs, data.categoryPosts))
        return
      }

      try {
        const response = await fetchHomeData({
          country: currentCountry,
          categorySlugs,
          categoryLimit: CATEGORY_POST_LIMIT,
        })

        if (isCancelled) return

        setCategoryPosts(mapCategoryPostsForConfigs(selectedConfigs, response.categoryPosts))
      } catch (error) {
        console.error("Error fetching category posts:", error)
        if (!isCancelled) {
          setCategoryPosts({})
        }
      }
    }

    updateCategoryPosts()

    return () => {
      isCancelled = true
    }
  }, [isOffline, data?.categoryPosts, selectedConfigs, categorySlugs, currentCountry])

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
              <Link
                href={getCategoryUrl("news", currentCountry)}
                className="text-xs text-blue-600 flex items-center gap-1"
              >
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
                <Link href={getCategoryUrl("news", currentCountry)} className="text-xs text-blue-600">
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
                  href={getCategoryUrl(categoryName.toLowerCase(), currentCountry)}
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
