"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { useEffect, useState } from "react"
import { HomeAfterHeroAd } from "@/components/HomeAfterHeroAd"
import useSWR from "swr"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import { HomePageSkeleton } from "./HomePageSkeleton"
import { getLatestPosts, getCategories, getPostsByCategory } from "@/lib/api/wordpress"
import { categoryConfigs } from "@/config/homeConfig"
import Link from "next/link"
import { NewsGrid } from "@/components/NewsGrid"
import { OfflineNotice } from "./OfflineNotice"

interface HomeContentProps {
  initialPosts?: any[]
  initialData?: {
    taggedPosts: any[]
    featuredPosts: any[]
    categories: any[]
    recentPosts: any[]
    categoryPosts?: Record<string, any[]>
  }
}

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

const fetchHomeData = async () => {
  try {
    if (!isOnline()) {
      console.log("Device is offline, using cached data")
      throw new Error("Device is offline")
    }

    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled([getLatestPosts(50), getCategories()])

    const latestPostsResult = results[0].status === "fulfilled" ? results[0].value : { posts: [] }
    const categoriesResult = results[1].status === "fulfilled" ? results[1].value : { categories: [] }

    const posts = latestPostsResult.posts || []
    const categories = categoriesResult.categories || []

    const categoryPromises = categoryConfigs.map(async (config) => {
      try {
        const result = await getPostsByCategory(config.slug, 5)
        return { slug: config.slug, posts: result.posts || [] }
      } catch (error) {
        console.error(`Error fetching ${config.name} posts:`, error)
        return { slug: config.slug, posts: [] }
      }
    })

    const categoryResults = await Promise.allSettled(categoryPromises)
    const categoryPosts: Record<string, any[]> = {}

    categoryResults.forEach((result) => {
      if (result.status === "fulfilled") {
        categoryPosts[result.value.slug] = result.value.posts
      }
    })

    const fpTaggedPosts = posts.filter((post) =>
      post.tags?.nodes?.some((tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp"),
    )

    console.log(`Found ${fpTaggedPosts.length} fp-tagged posts out of ${posts.length} total posts`)

    return {
      taggedPosts: fpTaggedPosts,
      featuredPosts: posts.slice(0, 6),
      categories: categories,
      recentPosts: posts.slice(0, 10),
      categoryPosts,
    }
  } catch (error) {
    console.error("Error fetching home data:", error)
    throw error
  }
}

export function HomeContent({ initialPosts = [], initialData }: HomeContentProps) {
  const [isOffline, setIsOffline] = useState(!isOnline())

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

  const fallbackData =
    initialData ||
    (initialPosts.length > 0
      ? {
          taggedPosts: initialPosts.filter((post) =>
            post.tags?.nodes?.some((tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp"),
          ),
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
        })

  const { data, error, isLoading } = useSWR("homepage-data", fetchHomeData, {
    fallbackData,
    revalidateOnMount: !initialData, // Only revalidate if no server-provided initial data
    revalidateOnFocus: false,
    refreshInterval: isOffline ? 0 : 300000,
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

  const { taggedPosts = [], featuredPosts = [], recentPosts = [], categoryPosts = {} } = data || fallbackData

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

  // If we don't have enough fp posts, show a message or fallback
  if (taggedPosts.length === 0) {
    console.warn("No fp-tagged posts found, using fallback content")
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
        {isOffline && <OfflineNotice />}

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

        {/* Category Sections - Restored using NewsGrid */}
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {categoryConfigs.map((config) => {
            const posts = categoryPosts[config.slug] || []
            if (!posts || posts.length === 0) return null

            const isSport = config.slug === "sport"

            return (
              <section key={config.slug} className="bg-white p-2 md:p-3 rounded-lg">
                <div className="flex items-center mb-2 md:mb-3">
                  <h2 className="text-base md:text-lg font-bold">{config.name}</h2>
                  <Link
                    href={`/category/${config.slug}`}
                    className="ml-auto text-xs md:text-sm text-blue-500 hover:underline"
                  >
                    View all
                  </Link>
                </div>

                <NewsGrid
                  posts={isSport ? posts.slice(0, 4) : posts}
                  showSportCategory={isSport}
                  sportCategoryPosts={isSport ? posts : []}
                  className=""
                />
              </section>
            )
          })}
        </div>
      </div>
    </ErrorBoundary>
  )
}
