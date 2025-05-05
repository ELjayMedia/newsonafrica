"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import { VerticalCard } from "@/components/VerticalCard"
import Link from "next/link"
import React, { useEffect, Suspense } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { HomeAfterHeroAd } from "@/components/HomeAfterHeroAd"
import { HomeMidContentAd } from "@/components/HomeMidContentAd"
import { useQuery } from "@tanstack/react-query"
import { fetchFeaturedPosts, fetchCategorizedPosts, fetchTaggedPosts } from "@/lib/wordpress-api"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import { HomePageSkeleton } from "./HomePageSkeleton"

interface HomeContentProps {
  initialData: {
    taggedPosts: any[]
    featuredPosts: any[]
    categories: any[]
    recentPosts: any[]
  }
}

// Separate component for each category section to enable independent loading
const CategorySection = ({ categoryName, categories }) => {
  const getPostsForCategoryAndChildren = (categoryName: string, allCategories: any[]) => {
    if (!allCategories || !Array.isArray(allCategories)) {
      console.warn(`Invalid categories data for ${categoryName}`)
      return []
    }

    const category = allCategories.find((cat) => cat?.name?.toLowerCase() === categoryName.toLowerCase())
    if (!category) {
      console.warn(`Category not found: ${categoryName}`)
      return []
    }

    const childCategories = allCategories.filter(
      (cat) => cat?.parent?.node?.name?.toLowerCase() === categoryName.toLowerCase(),
    )

    const allPosts = [...(category.posts?.nodes || []), ...childCategories.flatMap((child) => child.posts?.nodes || [])]

    return Array.from(new Set(allPosts.map((post) => post?.id)))
      .map((id) => allPosts.find((post) => post?.id === id))
      .filter((post) => post && !post.tags?.nodes?.some((tag) => tag?.slug === "fp"))
      .slice(0, 5)
  }

  const posts = getPostsForCategoryAndChildren(categoryName, categories)

  return (
    <section className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4 capitalize">
        <Link href={`/category/${categoryName.toLowerCase()}`} className="hover:text-blue-600 transition-colors">
          {categoryName}
        </Link>
      </h2>
      <NewsGrid
        posts={posts.map((post) => ({
          ...post,
          type: categoryName === "Opinion" ? "OPINION" : undefined,
        }))}
        layout="horizontal"
        className="compact-grid"
      />
    </section>
  )
}

export function HomeContent({ initialData }: HomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Use React Query for data fetching with optimized settings
  const {
    data: taggedPostsData,
    error: taggedError,
    isLoading: taggedLoading,
  } = useQuery({
    queryKey: ["taggedPosts", "fp", 4],
    queryFn: () => fetchTaggedPosts("fp", 4),
    initialData: initialData?.taggedPosts,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  })

  const {
    data: featuredPostsData,
    error: featuredError,
    isLoading: featuredLoading,
  } = useQuery({
    queryKey: ["featuredPosts"],
    queryFn: fetchFeaturedPosts,
    initialData: initialData?.featuredPosts,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  })

  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["categorizedPosts"],
    queryFn: fetchCategorizedPosts,
    initialData: initialData?.categories,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  })

  // Combine all loading states
  const isLoading = taggedLoading || featuredLoading || categoriesLoading

  // Combine all errors
  const error = taggedError || featuredError || categoriesError

  useEffect(() => {
    if (error) {
      console.error("Error in HomeContent:", error)
    }
  }, [error])

  if (isLoading && !initialData) {
    return <HomePageSkeleton />
  }

  if (error && !initialData) {
    return <div>Error loading content. Please try again later.</div>
  }

  // Use data or fallback to initialData
  const taggedPosts = taggedPostsData || initialData?.taggedPosts || []
  const featuredPosts = featuredPostsData || initialData?.featuredPosts || []
  const categories = categoriesData || initialData?.categories || []

  const mainStory = taggedPosts?.[0] || featuredPosts?.[0] || null
  const secondaryStories = featuredPosts?.slice(1, 4) || []
  const verticalCardPosts = taggedPosts?.slice(1, 4) || [] // Use the next 3 tagged posts for vertical cards

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
        {/* Hero section - highest priority */}
        <section className="bg-gray-50 px-2 py-1 rounded-lg shadow-sm">
          {mainStory && <FeaturedHero post={mainStory} />}
        </section>

        {/* Vertical cards - high priority */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
          {verticalCardPosts.map((post) => (
            <div key={post.id} className="flex">
              <VerticalCard post={post} className="w-full" />
            </div>
          ))}
        </section>

        <HomeAfterHeroAd />

        {/* Secondary stories - medium priority */}
        <section className="bg-white p-4 rounded-lg shadow-sm md:flex md:flex-col">
          {secondaryStories.length > 0 && <SecondaryStories posts={secondaryStories} layout="horizontal" />}
        </section>

        {/* Category sections - lower priority, load progressively */}
        <div className="grid grid-cols-1 gap-4">
          {["news", "business", "entertainment", "sport", "editorial"].map((categoryName, index) => (
            <React.Fragment key={categoryName}>
              <ErrorBoundary>
                <Suspense fallback={<CategorySectionSkeleton />}>
                  <CategorySection categoryName={categoryName} categories={categories} />
                </Suspense>
              </ErrorBoundary>
              {index === 1 && <HomeMidContentAd />}
            </React.Fragment>
          ))}
        </div>

        {/* Health section - lowest priority */}
        <ErrorBoundary>
          <Suspense fallback={<CategorySectionSkeleton />}>
            <section className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">
                <Link href="/category/health" className="hover:text-blue-600 transition-colors">
                  Health
                </Link>
              </h2>
              <NewsGrid
                posts={(categories.find((c) => c?.name?.toLowerCase() === "health")?.posts?.nodes || [])
                  .filter((post) => post && !post.tags?.nodes?.some((tag) => tag?.slug === "fp"))
                  .slice(0, 5)
                  .map((post) => ({
                    ...post,
                    type: "HEALTH",
                  }))}
                layout="vertical"
                className="compact-grid"
              />
            </section>
          </Suspense>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}

// Skeleton for category sections
const CategorySectionSkeleton = () => (
  <div className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-24 h-16 bg-gray-200 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)
