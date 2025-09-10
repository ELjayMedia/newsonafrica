"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import Link from "next/link"
import React, { useEffect, useState } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { HomeAfterHeroAd } from "@/components/HomeAfterHeroAd"
import { HomeMidContentAd } from "@/components/HomeMidContentAd"
import useSWR from "swr"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import { HomePageSkeleton } from "./HomePageSkeleton"
import { getLatestPosts, getCategories, getPostsByCategory } from "@/lib/api/wordpress"
import { categoryConfigs, type CategoryConfig } from "@/config/homeConfig"
import type { Post, Category } from "@/types/content"

interface HomeContentProps {
  initialPosts?: Post[]
  initialData?: {
    taggedPosts: Post[]
    featuredPosts: Post[]
    categories: Category[]
    recentPosts: Post[]
  }
}

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

// Update the fetchHomeData function to use new WordPress API
const fetchHomeData = async (): Promise<{
  taggedPosts: Post[]
  featuredPosts: Post[]
  categories: Category[]
  recentPosts: Post[]
}> => {
  try {
    if (!isOnline()) {
      console.log("Device is offline, using cached data")
      throw new Error("Device is offline")
    }

    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled([
      getLatestPosts(50), // Get more posts to ensure we have enough fp-tagged ones
      getCategories(), // Get all categories
    ])

    const latestPostsResult = results[0].status === "fulfilled" ? results[0].value : { posts: [] }
    const categoriesResult = results[1].status === "fulfilled" ? results[1].value : { categories: [] }

    const posts = latestPostsResult.posts || []
    const categories = categoriesResult.categories || []

    // Filter posts that are tagged with 'fp'
    const fpTaggedPosts = posts.filter((post) =>
      post.tags?.nodes?.some((tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp"),
    )

    console.log(`Found ${fpTaggedPosts.length} fp-tagged posts out of ${posts.length} total posts`)

    return {
      taggedPosts: fpTaggedPosts, // Use all fp tagged posts
      featuredPosts: posts.slice(0, 6), // Use first 6 as featured
      categories: categories,
      recentPosts: posts.slice(0, 10), // Use first 10 as recent
    }
  } catch (error) {
    console.error("Error fetching home data:", error)
    throw error
  }
}

export function HomeContent({ initialPosts = [], initialData }: HomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [categoryPosts, setCategoryPosts] = useState<Record<string, Post[]>>({})

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

  // Create fallback data from initialPosts if provided
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

  // Update the useSWR configuration for better error handling
  const { data, error, isLoading } = useSWR<{
    taggedPosts: Post[]
    featuredPosts: Post[]
    categories: Category[]
    recentPosts: Post[]
  }>("homepage-data", fetchHomeData, {
    fallbackData: initialData || fallbackData,
    revalidateOnMount: !initialData && !initialPosts.length, // Only revalidate if no initial data
    revalidateOnFocus: false,
    refreshInterval: isOffline ? 0 : 300000, // Only refresh every 5 minutes if online
    dedupingInterval: 60000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    onError: (err) => {
      console.error("SWR Error:", err)
      if (!initialData && !initialPosts.length) {
        setIsOffline(true)
      }
    },
    shouldRetryOnError: !isOffline,
  })

  // Fetch category-specific posts
  useEffect(() => {
    const fetchCategoryPosts = async () => {
      if (isOffline) return

      const categoryPromises = categoryConfigs.map(async (config) => {
        try {
          const result = await getPostsByCategory(config.name.toLowerCase(), 5)
          return { name: config.name, posts: result.posts || [] }
        } catch (error) {
          console.error(`Error fetching ${config.name} posts:`, error)
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

  // Show offline notification if needed
  const renderOfflineNotification = () => {
    if (isOffline) {
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
    }
    return null
  }

  // Safely extract data with fallbacks
  const {
    taggedPosts = [],
    featuredPosts = [],
    categories = [],
    recentPosts = [],
  } = data || initialData || fallbackData

  // Show skeleton during initial loading
  if (isLoading && !initialData && !initialPosts.length) {
    return <HomePageSkeleton />
  }

  // Show error message if data fetch failed and we have no initial data
  if (error && !featuredPosts.length && !isOffline) {
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
  if (!taggedPosts.length && !featuredPosts.length && !recentPosts.length) {
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
  const mainStory = taggedPosts[0] || null // Show latest fp-tagged post only
  const secondaryStories = taggedPosts.slice(1, 5) || [] // Show next 4 fp-tagged posts
  const verticalCardPosts = taggedPosts.slice(5, 8) || [] // Show next 3 fp-tagged posts after secondary stories

  // If we don't have enough fp posts, show a message or fallback
  if (taggedPosts.length === 0) {
    console.warn("No fp-tagged posts found, using fallback content")
  }

  // Reusable CategorySection component
  const CategorySection = ({ name, layout, typeOverride, showAdAfter }: CategoryConfig) => {
    const posts = categoryPosts[name] || []

    // Only render the section if there are posts
    if (posts.length === 0) return null

    return (
      <React.Fragment key={name}>
        <section className="bg-white rounded-lg">
          <h2 className="text-lg md:text-xl font-bold capitalize mb-3">
            <Link href={`/category/${name.toLowerCase()}`} className="hover:text-blue-600 transition-colors">
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
        {showAdAfter && <HomeMidContentAd />}
      </React.Fragment>
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
        featuredPosts?.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteConfig.url}/post/${post.slug}`,
          name: post.title,
        })) || [],
    },
  ]

  // Show empty state if no fp-tagged content is available
  if (!taggedPosts.length && !isLoading) {
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

        {/* Hero Section - Show the latest post */}
        {mainStory && (
          <section className="bg-gray-50 px-2 py-2 rounded-lg">
            <FeaturedHero post={mainStory} />
          </section>
        )}

        <HomeAfterHeroAd />

        {/* Secondary Stories - Show featured posts */}
        {secondaryStories.length > 0 && (
          <section className="bg-white p-2 md:p-3 rounded-lg md:flex md:flex-col">
            <SecondaryStories posts={secondaryStories} layout="horizontal" />
          </section>
        )}

        {/* Category Sections - Show posts from each category */}
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {categoryConfigs.map((config) => (
            <CategorySection key={config.name} {...config} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
