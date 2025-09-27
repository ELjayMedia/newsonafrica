"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import Link from "next/link"
import React, { useEffect, useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import { HomePageSkeleton } from "./HomePageSkeleton"
import {
  getLatestPostsForCountry,
  getCategoriesForCountry,
  getPostsForCategories,
  getFpTaggedPostsForCountry,
  mapPostsToHomePosts,
} from "@/lib/wordpress-api"
import type { WordPressPost } from "@/lib/wordpress-api"
import { getCurrentCountry, getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import { categoryConfigs, type CategoryConfig } from "@/config/homeConfig"
import type { Category } from "@/types/content"
import { CountryNavigation, CountrySpotlight } from "@/components/CountryNavigation"
import type { HomePost, CountryPosts } from "@/types/home"

type CategorySectionProps = CategoryConfig & {
  posts: HomePost[]
}

const CategorySection = React.memo(({ name, layout, typeOverride, posts }: CategorySectionProps) => {
  if (posts.length === 0) return null

  return (
    <section className="bg-white rounded-lg">
      <h2 className="text-lg md:text-xl font-bold capitalize mb-3">
        <Link href={getCategoryUrl(name.toLowerCase())} className="hover:text-blue-600 transition-colors">
          {name}
        </Link>
      </h2>
      <NewsGrid
        posts={posts.map((post) => ({
          ...post,
          type: typeOverride,
        }))}
        layout={layout}
        className="compact-grid"
      />
    </section>
  )
})

CategorySection.displayName = "CategorySection"

const areCategoryPostsEqual = (a: Record<string, HomePost[]>, b: Record<string, HomePost[]>) => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    const postsA = a[key] ?? []
    const postsB = b[key] ?? []

    if (postsA.length !== postsB.length) return false

    for (let index = 0; index < postsA.length; index += 1) {
      const postA = postsA[index]
      const postB = postsB[index]

      if (postA.id !== postB.id || postA.slug !== postB.slug || postA.date !== postB.date) {
        return false
      }
    }
  }

  return true
}

// Declare the HomeContentProps type
type HomeContentProps = {
  initialPosts?: HomePost[]
  countryPosts?: CountryPosts
  featuredPosts?: HomePost[]
  initialData?: {
    taggedPosts: HomePost[]
    recentPosts: HomePost[]
    countryPosts: CountryPosts
    featuredPosts: HomePost[]
  }
  emptyState?: {
    title: string
    description: string
  }
}

const handleRefresh = () => {
  window.location.reload()
}

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

const fetchHomeData = async (
  country: string,
): Promise<{
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: Category[]
  recentPosts: HomePost[]
}> => {
  const startTime = performance.now()

  try {
    if (!isOnline()) {
      console.log("[v0] Device is offline, using cached data")
      throw new Error("Device is offline")
    }

    const results = await Promise.allSettled([
      getFpTaggedPostsForCountry(country, 8),
      getLatestPostsForCountry(country, 10),
      getCategoriesForCountry(country),
    ])

    const taggedPosts = results[0].status === "fulfilled" ? results[0].value : ([] as HomePost[])

    const latestPostsResult = results[1].status === "fulfilled" ? results[1].value : { posts: [] as any[] }
    const recentPosts = mapPostsToHomePosts(latestPostsResult.posts ?? [], country)

    const categoriesResult = results[2].status === "fulfilled" ? results[2].value : { categories: [] }
    const categories = categoriesResult.categories || []

    const featuredPosts = taggedPosts.length > 0 ? taggedPosts.slice(0, 6) : recentPosts.slice(0, 6)

    const endTime = performance.now()
    console.log(`[v0] Home data fetch completed in ${Math.round(endTime - startTime)}ms`)

    return {
      taggedPosts,
      featuredPosts,
      categories,
      recentPosts,
    }
  } catch (error) {
    const endTime = performance.now()
    console.error(`[v0] Home data fetch failed after ${Math.round(endTime - startTime)}ms:`, error)
    throw error
  }
}

export function HomeContent({
  initialPosts = [],
  countryPosts = {},
  featuredPosts = [],
  initialData,
  emptyState,
}: HomeContentProps) {
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [categoryPosts, setCategoryPosts] = useState<Record<string, HomePost[]>>({})
  const currentCountry = getCurrentCountry()

  const handleOnline = useCallback(() => setIsOffline(false), [])
  const handleOffline = useCallback(() => setIsOffline(true), [])

  // Listen for online/offline events
  useEffect(() => {
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [handleOnline, handleOffline])

  // Create fallback data from initial posts based on current country

  const initialCountryPosts = useMemo(
    () => countryPosts[currentCountry] || initialPosts,
    [countryPosts, currentCountry, initialPosts],
  )

  const baselinePosts = useMemo(
    () => (initialCountryPosts.length ? initialCountryPosts : initialPosts),
    [initialCountryPosts, initialPosts],
  )

  const fallbackData = useMemo(() => {
    if (initialData) return initialData


    if (baselinePosts.length > 0) {
      const fallbackFeatured = featuredPosts.length ? featuredPosts.slice(0, 6) : baselinePosts.slice(0, 6)

      return {
        taggedPosts: baselinePosts.slice(0, 8),
        featuredPosts: fallbackFeatured,
        categories: [],
        recentPosts: baselinePosts.slice(0, 10),
      }
    }

    return {
      taggedPosts: [],
      featuredPosts: [],
      categories: [],
      recentPosts: [],
    }
  }, [initialData, baselinePosts, featuredPosts])

  const { data, error, isLoading } = useSWR<{
    taggedPosts: HomePost[]
    featuredPosts: HomePost[]
    categories: Category[]
    recentPosts: HomePost[]
  }>([`homepage-data-${currentCountry}`, currentCountry], () => fetchHomeData(currentCountry), {
    fallbackData,
    revalidateOnMount: !initialData && initialPosts.length === 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: isOffline ? 0 : 300000, // 5 minutes when online
    dedupingInterval: 60000, // 1 minute deduping
    errorRetryCount: 3,
    errorRetryInterval: (retryCount) => Math.min(1000 * 2 ** retryCount, 30000), // Exponential backoff
    onError: (err) => {
      console.error("[v0] SWR Error:", err)
      if (!initialData && initialPosts.length === 0) {
        setIsOffline(true)
      }
    },
    onSuccess: () => {
      // Reset offline state on successful fetch
      if (isOffline) {
        setIsOffline(false)
      }
    },
    shouldRetryOnError: (error) => {
      // Don't retry on network errors when offline
      if (isOffline) return false
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) return false
      return true
    },
  })

  useEffect(() => {
    let isCancelled = false

    const fetchCategoryPosts = async () => {
      if (isOffline) return

      try {
        const slugs = categoryConfigs.map((config) => config.name.toLowerCase())
        const batchedPosts = await getPostsForCategories(currentCountry, slugs, 5)

        if (isCancelled) return

        const mappedPosts = categoryConfigs.reduce<Record<string, HomePost[]>>((acc, config) => {
          const slug = config.name.toLowerCase()
          const categoryData = batchedPosts[slug]

          if (categoryData?.posts?.length) {
            acc[config.name] = mapPostsToHomePosts(categoryData.posts as WordPressPost[], currentCountry)
          }

          return acc
        }, {})

        setCategoryPosts((prev) => {
          if (areCategoryPostsEqual(prev, mappedPosts)) {
            return prev
          }

          return mappedPosts
        })
      } catch (error) {
        console.error("Error fetching batched category posts:", error)
        if (!isCancelled) {
          setCategoryPosts((prev) => {
            if (Object.keys(prev).length === 0) {
              return prev
            }

            return {}
          })
        }
      }
    }

    fetchCategoryPosts()

    return () => {
      isCancelled = true
    }
  }, [isOffline, currentCountry])

  const offlineNotification = useMemo(() => {
    if (!isOffline) return null

    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">You are currently offline. Some content may not be up to date.</p>
          </div>
        </div>
      </div>
    )
  }, [isOffline])

  // Safely extract data with fallbacks
  const {
    taggedPosts = [],
    featuredPosts: fetchedFeaturedPosts = [],
    categories = [],
    recentPosts = [],
  } = data || fallbackData

  // Use provided featuredPosts if available
  const finalFeaturedPosts = useMemo(
    () => (featuredPosts.length > 0 ? featuredPosts : fetchedFeaturedPosts),
    [featuredPosts, fetchedFeaturedPosts],
  )

  const heroSource = useMemo(() => {
    if (taggedPosts.length > 0) return taggedPosts
    if (finalFeaturedPosts.length > 0) return finalFeaturedPosts
    return recentPosts
  }, [taggedPosts, finalFeaturedPosts, recentPosts])

  const mainStory = useMemo(() => heroSource[0] || null, [heroSource])
  const secondaryStories = useMemo(() => heroSource.slice(1, 5), [heroSource])

  // Generate schema.org structured data for the homepage
  const schemas = useMemo(
    () => [
      // WebPage schema for the homepage
      getWebPageSchema(
        siteConfig.url,
        "News On Africa - Where the Continent Connects",
        "A pan-African news platform providing comprehensive coverage across the continent",
      ),

      // ItemList schema for featured articles
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement:
          finalFeaturedPosts?.map((post, index) => ({
            "@type": "ListItem",
            position: index + 1,

            url: `${siteConfig.url}${getArticleUrl(post.slug, (post as any)?.country)}`,

            name: post.title,
          })) || [],
      },
    ],
    [finalFeaturedPosts],
  )

  // Show skeleton during initial loading
  if (isLoading && !initialData && !initialPosts.length) {
    return <HomePageSkeleton />
  }

  if (emptyState) {
    return (
      <div className="p-4 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">{emptyState.title}</h2>
          <p className="text-gray-600 mb-4">{emptyState.description}</p>
          <div className="space-y-2">
            <button
              onClick={handleRefresh}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors inline-block"
            >
              Check System Health
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (error && !finalFeaturedPosts.length && !isOffline) {
    return (
      <div className="p-4 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">Unable to load content</h2>
          <p className="text-gray-600 mb-4">We're experiencing technical difficulties. Please try again later.</p>
          <div className="space-y-2">
            <button
              onClick={handleRefresh}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state if no content is available
  if (!taggedPosts.length && !finalFeaturedPosts.length && !recentPosts.length) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">No Content Available</h2>
        <p>Please check back later for the latest news and updates.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  // Show empty state if no fp-tagged content is available
  if (!heroSource.length && !isLoading) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Featured Content Coming Soon</h2>
        <p>We're preparing featured stories for you. Please check back later.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <SchemaOrg schemas={schemas} />
      <div className="space-y-3 md:space-y-4 pb-16 md:pb-4">
        {offlineNotification}

        {/* Pan-African Country Navigation */}
        <CountryNavigation />

        {/* Hero Section - Show the latest post */}
        {mainStory && (
          <section className="bg-gray-50 px-2 py-2 rounded-lg">
            <FeaturedHero post={mainStory} />
          </section>
        )}

        {/* Country Spotlight - Show posts from different countries */}
        {Object.keys(countryPosts).length > 0 && <CountrySpotlight countryPosts={countryPosts} />}

        {/* Secondary Stories - Show featured posts */}
        {secondaryStories.length > 0 && (
          <section className="bg-white p-2 md:p-3 rounded-lg md:flex md:flex-col">
            <SecondaryStories posts={secondaryStories} layout="horizontal" />
          </section>
        )}

        {/* Category Sections - Show posts from each category */}
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {categoryConfigs.map((config) => (
            <CategorySection key={config.name} {...config} posts={categoryPosts[config.name] || []} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
