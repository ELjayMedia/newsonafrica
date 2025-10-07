"use client"

import { FeaturedHeroClient as FeaturedHero } from "@/components/client/FeaturedHeroClient"
import { SecondaryStoriesClient as SecondaryStories } from "@/components/client/SecondaryStoriesClient"
import { NewsGridClient as NewsGrid } from "@/components/client/NewsGridClient"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import { HomePageSkeleton } from "./HomePageSkeleton"
import { getPostsForCategories, mapPostsToHomePosts } from "@/lib/wordpress-api"
import type { WordPressPost } from "@/lib/wordpress-api"
import { getCurrentCountry, getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import { categoryConfigs, type CategoryConfig } from "@/config/homeConfig"
import type { Category } from "@/types/content"
import { CountryNavigation, CountrySpotlight } from "@/components/CountryNavigation"
import type { HomePost, CountryPosts } from "@/types/home"
import { isOnline, useHomeData, type HomeData } from "@/hooks/useHomeData"

interface HomeContentProps {
  initialPosts?: HomePost[]
  countryPosts?: CountryPosts
  featuredPosts?: HomePost[]
  initialData?: {
    taggedPosts: HomePost[]
    featuredPosts: HomePost[]
    categories: Category[]
    recentPosts: HomePost[]
  }
}

export function HomeContent({
  initialPosts = [],
  countryPosts = {},
  featuredPosts = [],
  initialData,
}: HomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [categoryPosts, setCategoryPosts] = useState<Record<string, HomePost[]>>({})
  const currentCountry = getCurrentCountry()

  // Listen for online/offline events
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

  // Create fallback data from initial posts based on current country
  const initialCountryPosts = countryPosts[currentCountry] || initialPosts
  const baselinePosts = initialCountryPosts.length ? initialCountryPosts : initialPosts
  const fallbackData: HomeData =
    initialData ||
    (baselinePosts.length > 0
      ? {
          taggedPosts: baselinePosts.slice(0, 8),
          featuredPosts: featuredPosts.length ? featuredPosts.slice(0, 6) : baselinePosts.slice(0, 6),
          categories: [],
          recentPosts: baselinePosts.slice(0, 10),
        }
      : {
          taggedPosts: [],
          featuredPosts: [],
          categories: [],
          recentPosts: [],
        })

  const { data, error, isLoading } = useHomeData(currentCountry, {
    fallbackData,
    revalidateOnMount: !initialData && !baselinePosts.length,
    revalidateOnFocus: false,
    refreshInterval: isOffline ? 0 : 300000, // Only refresh every 5 minutes if online
    dedupingInterval: 60000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    onError: (err) => {
      console.error("[v0] SWR Error:", err)
      if (!initialData && !initialPosts.length) {
        setIsOffline(true)
      }
    },
    shouldRetryOnError: !isOffline,
  })

  useEffect(() => {
    let isCancelled = false

    const fetchCategoryPosts = async () => {
      if (isOffline) return

      try {
        console.log("[v0] Fetching category posts for country:", currentCountry)
        const slugs = categoryConfigs.map((config) => config.name.toLowerCase())
        const batchedPosts = await getPostsForCategories(currentCountry, slugs, 5)

        if (isCancelled) return

        const mappedPosts: Record<string, HomePost[]> = {}

        categoryConfigs.forEach((config) => {
          const slug = config.name.toLowerCase()
          const categoryData = batchedPosts[slug]

          if (categoryData?.posts?.length) {
            mappedPosts[config.name] = mapPostsToHomePosts(categoryData.posts as WordPressPost[], currentCountry)
          }
        })

        console.log("[v0] Category posts fetched:", Object.keys(mappedPosts).length, "categories")
        setCategoryPosts(mappedPosts)
      } catch (error) {
        console.error("[v0] Error fetching batched category posts:", error)
        if (!isCancelled) {
          setCategoryPosts({})
        }
      }
    }

    fetchCategoryPosts()

    return () => {
      isCancelled = true
    }
  }, [isOffline, currentCountry])

  // Show offline notification if needed
  const renderOfflineNotification = () => {
    if (isOffline) {
      return (
        <div
          className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3"
          role="status"
          aria-live="polite"
        >
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
    }
    return null
  }

  // Safely extract data with fallbacks
  const {
    taggedPosts = [],
    featuredPosts: fetchedFeaturedPosts = [],
    categories = [],
    recentPosts = [],
  } = data || fallbackData

  // Use provided featuredPosts if available
  const finalFeaturedPosts = featuredPosts.length > 0 ? featuredPosts : fetchedFeaturedPosts

  // Show skeleton during initial loading
  if (isLoading && !initialData && !initialPosts.length) {
    return <HomePageSkeleton />
  }

  // Show error message if data fetch failed and we have no initial data
  if (error && !finalFeaturedPosts.length && !isOffline) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Unable to load content</h2>
        <p>We're experiencing technical difficulties. Please try again later.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
        >
          Refresh Page
        </button>
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

  // Extract main content posts - ensure we have enough fp posts
  const heroSource =
    taggedPosts.length > 0 ? taggedPosts : finalFeaturedPosts.length > 0 ? finalFeaturedPosts : recentPosts

  const mainStory = heroSource[0] || null
  const secondaryStories = heroSource.slice(1, 5)

  // Reusable CategorySection component
  const CategorySection = ({ name, layout, typeOverride }: CategoryConfig) => {
    const posts = categoryPosts[name] || []

    // Only render the section if there are posts
    if (posts.length === 0) return null

    return (
      <section key={name} className="bg-white rounded-lg">
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
  }

  // Generate schema.org structured data for the homepage
  const schemas = [
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
  ]

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
        {renderOfflineNotification()}

        {/* Pan-African Country Navigation - Always shows all countries */}
        <CountryNavigation />

        {/* Hero Section - Shows content from selected country */}
        {mainStory && (
          <section className="bg-gray-50 px-2 py-2 rounded-lg">
            <FeaturedHero post={mainStory} />
          </section>
        )}

        {/* Pan-African Spotlight - Shows posts from different countries (not selected country) */}
        <CountrySpotlight countryPosts={countryPosts} />

        {/* Secondary Stories - Shows featured posts from selected country */}
        {secondaryStories.length > 0 && (
          <section className="bg-white p-2 md:p-3 rounded-lg md:flex md:flex-col">
            <SecondaryStories posts={secondaryStories} layout="horizontal" />
          </section>
        )}

        {/* Category Sections - Shows posts from selected country */}
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {categoryConfigs.map((config) => (
            <CategorySection key={config.name} {...config} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
