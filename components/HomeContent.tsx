"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import { VerticalCard } from "@/components/VerticalCard"
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
import { fetchTaggedPosts, fetchFeaturedPosts, fetchCategorizedPosts, fetchRecentPosts } from "@/lib/wordpress-api"
import { fetchSportPosts } from "@/lib/sport-utils"

interface HomeContentProps {
  initialData: {
    taggedPosts: any[]
    featuredPosts: any[]
    categories: any[]
    recentPosts: any[]
  }
}

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

// Update the fetchHomeData function to better handle errors
const fetchHomeData = async () => {
  try {
    if (!isOnline()) {
      console.log("Device is offline, using cached or mock data")
      throw new Error("Device is offline")
    }

    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled([
      fetchTaggedPosts("fp", 4),
      fetchFeaturedPosts(4),
      fetchCategorizedPosts(),
      fetchRecentPosts(10),
    ])

    return {
      taggedPosts: results[0].status === "fulfilled" ? results[0].value : [],
      featuredPosts: results[1].status === "fulfilled" ? results[1].value : [],
      categories: results[2].status === "fulfilled" ? results[2].value : [],
      recentPosts: results[3].status === "fulfilled" ? results[3].value : [],
    }
  } catch (error) {
    console.error("Error fetching home data:", error)
    throw error
  }
}

export function HomeContent({ initialData }: HomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [sportPosts, setSportPosts] = useState<any[]>([])

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

  useEffect(() => {
    const getSportPosts = async () => {
      try {
        const posts = await fetchSportPosts(5)
        setSportPosts(posts)
      } catch (error) {
        console.error("Error fetching sport/sports posts:", error)
      }
    }

    if (!isOffline) {
      getSportPosts()
    }
  }, [isOffline])

  // Update the useSWR configuration for better error handling
  const { data, error, isLoading } = useSWR("homepage-data", fetchHomeData, {
    initialData,
    revalidateOnMount: false, // Changed from !isOffline to false to prevent losing initial data
    revalidateOnFocus: false, // Changed to false to prevent losing data on focus
    refreshInterval: isOffline ? 0 : 300000, // Only refresh every 5 minutes if online
    dedupingInterval: 60000, // Increased to 1 minute
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    onError: (err) => {
      console.error("SWR Error:", err)
      // Don't show error UI if we have initial data
      if (!initialData) {
        setIsOffline(true) // Treat any error as offline for UI purposes
      }
    },
    shouldRetryOnError: !isOffline, // Don't retry if offline
    fallbackData: initialData, // Ensure we always have fallback data
  })

  // Log errors but don't crash the UI
  useEffect(() => {
    if (error) {
      console.error("Error in HomeContent:", error)
    }
  }, [error])

  // Show offline notification if needed
  const renderOfflineNotification = () => {
    if (isOffline) {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
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
  } = data || initialData || { taggedPosts: [], featuredPosts: [], categories: [], recentPosts: [] }

  // Show skeleton during initial loading
  if (isLoading && !initialData) {
    return <HomePageSkeleton />
  }

  // Show error message if data fetch failed and we have no initial data
  if (error && !initialData?.featuredPosts?.length && !isOffline) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Unable to load content</h2>
        <p>We're experiencing technical difficulties. Please try again later.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  // Extract main content posts
  const mainStory = taggedPosts?.[0] || featuredPosts?.[0] || null
  const secondaryStories = featuredPosts?.slice(0, 4) || []
  const verticalCardPosts = taggedPosts?.slice(1, 4) || [] // Use the next 3 tagged posts for vertical cards

  // Helper function to safely get posts for a category
  const getPostsForCategoryAndChildren = (categoryName: string, allCategories: any[]) => {
    if (!allCategories || !Array.isArray(allCategories) || allCategories.length === 0) {
      // Return empty array if categories are missing
      console.log(`No categories found for ${categoryName}`)
      return []
    }

    // Find the exact category by name (case insensitive)
    const category = allCategories.find((cat) => cat?.name?.toLowerCase() === categoryName.toLowerCase())

    if (!category) {
      console.log(`Category not found: ${categoryName}`)
      return []
    }

    // Find child categories
    const childCategories = allCategories.filter(
      (cat) => cat?.parent?.node?.name?.toLowerCase() === categoryName.toLowerCase(),
    )

    // Collect posts from the main category and its children
    const allPosts = [...(category.posts?.nodes || []), ...childCategories.flatMap((child) => child.posts?.nodes || [])]

    // Remove duplicates by ID and filter out posts without IDs
    return Array.from(new Set(allPosts.map((post) => post?.id)))
      .map((id) => allPosts.find((post) => post?.id === id))
      .filter((post) => post && post.id) // Ensure post exists and has an ID
      .slice(0, 5)
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
        taggedPosts?.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteConfig.url}/post/${post.slug}`,
          name: post.title,
        })) || [],
    },
  ]

  return (
    <ErrorBoundary>
      <SchemaOrg schemas={schemas} />
      <div className="space-y-4">
        {renderOfflineNotification()}

        {/* Hero Section - Show the latest post tagged 'fp' */}
        <section className="bg-gray-50 px-2 py-1 rounded-lg shadow-sm">
          {mainStory && <FeaturedHero post={mainStory} />}
        </section>

        {/* Vertical Cards - Show the next 3 posts tagged 'fp' */}
        {verticalCardPosts.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
            {verticalCardPosts.map((post) => (
              <div key={post.id} className="flex">
                <VerticalCard post={post} className="w-full" />
              </div>
            ))}
          </section>
        )}

        <HomeAfterHeroAd />

        {/* Secondary Stories - Show featured posts */}
        {secondaryStories.length > 0 && (
          <section className="bg-white p-4 rounded-lg shadow-sm md:flex md:flex-col">
            <SecondaryStories posts={secondaryStories} layout="horizontal" />
          </section>
        )}

        {/* Category Sections - Show posts from each category */}
        <div className="grid grid-cols-1 gap-4">
          {["news", "business", "entertainment", "sport", "editorial"].map((categoryName, index) => {
            // Get posts for this specific category
            const categoryPosts = getPostsForCategoryAndChildren(categoryName, categories)

            // Only render the section if there are posts
            return categoryPosts.length > 0 ? (
              <React.Fragment key={categoryName}>
                <section className="bg-white p-4 rounded-lg shadow-sm">
                  <h2 className="text-xl font-bold mb-4 capitalize">
                    <Link
                      href={`/category/${categoryName.toLowerCase()}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {categoryName}
                    </Link>
                  </h2>
                  <NewsGrid
                    posts={categoryPosts.map((post) => ({
                      ...post,
                      type: categoryName === "Opinion" ? "OPINION" : undefined,
                    }))}
                    layout="horizontal"
                    className="compact-grid"
                  />
                </section>
                {index === 1 && <HomeMidContentAd />}
              </React.Fragment>
            ) : null
          })}
        </div>

        {/* Health Section */}
        {(() => {
          const healthPosts = getPostsForCategoryAndChildren("health", categories)
          return healthPosts.length > 0 ? (
            <section className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">
                <Link href="/category/health" className="hover:text-blue-600 transition-colors">
                  Health
                </Link>
              </h2>
              <NewsGrid
                posts={healthPosts.map((post) => ({
                  ...post,
                  type: "HEALTH",
                }))}
                layout="vertical"
                className="compact-grid"
              />
            </section>
          ) : null
        })()}
        <NewsGrid posts={recentPosts} className="mb-8" sportCategoryPosts={sportPosts} showSportCategory={true} />
      </div>
    </ErrorBoundary>
  )
}
