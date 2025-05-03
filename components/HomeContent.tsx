"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import { VerticalCard } from "@/components/VerticalCard"
import Link from "next/link"
import React, { useEffect } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { HomeAfterHeroAd } from "@/components/HomeAfterHeroAd"
import { HomeMidContentAd } from "@/components/HomeMidContentAd"
import useSWR from "swr"
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

const fetcher = async () => {
  try {
    const [taggedPosts, featuredPosts, categories] = await Promise.all([
      fetchTaggedPosts("fp", 4), // Fetch 4 posts with "fp" tag
      fetchFeaturedPosts(),
      fetchCategorizedPosts(),
    ])
    return { taggedPosts, featuredPosts, categories }
  } catch (error) {
    console.error("Error fetching home content:", error)
    throw error
  }
}

export function HomeContent({ initialData }: HomeContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { data, error, isLoading } = useSWR("/api/home-content", fetcher, {
    initialData,
    revalidateOnMount: true,
    refreshInterval: 60000, // Refresh every 60 seconds
  })

  useEffect(() => {
    if (error) {
      console.error("Error in HomeContent:", error)
    }
  }, [error])

  if (isLoading) {
    return <HomePageSkeleton />
  }

  if (error) {
    return <div>Error loading content. Please try again later.</div>
  }

  if (!data) {
    return <HomePageSkeleton />
  }

  const { taggedPosts, featuredPosts, categories } = data

  const mainStory = taggedPosts?.[0] || featuredPosts?.[0] || null
  const secondaryStories = featuredPosts?.slice(1, 4) || []
  const verticalCardPosts = taggedPosts?.slice(1, 4) || [] // Use the next 3 tagged posts for vertical cards

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
        <section className="bg-gray-50 px-2 py-1 rounded-lg shadow-sm">
          {mainStory && <FeaturedHero post={mainStory} />}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
          {verticalCardPosts.map((post) => (
            <div key={post.id} className="flex">
              <VerticalCard post={post} className="w-full" />
            </div>
          ))}
        </section>

        <HomeAfterHeroAd />

        <section className="bg-white p-4 rounded-lg shadow-sm md:flex md:flex-col">
          {secondaryStories.length > 0 && <SecondaryStories posts={secondaryStories} layout="horizontal" />}
        </section>

        <div className="grid grid-cols-1 gap-4">
          {["news", "business", "entertainment", "sport", "editorial"].map((categoryName, index) => (
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
                  posts={getPostsForCategoryAndChildren(categoryName, categories).map((post) => ({
                    ...post,
                    type: categoryName === "Opinion" ? "OPINION" : undefined,
                  }))}
                  layout="horizontal"
                  className="compact-grid"
                />
              </section>
              {index === 1 && <HomeMidContentAd />}
            </React.Fragment>
          ))}
        </div>

        <section className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4">
            <Link href="/category/health" className="hover:text-blue-600 transition-colors">
              Health
            </Link>
          </h2>
          <NewsGrid
            posts={getPostsForCategoryAndChildren("health", categories).map((post) => ({
              ...post,
              type: "HEALTH",
            }))}
            layout="vertical"
            className="compact-grid"
          />
        </section>
      </div>
    </ErrorBoundary>
  )
}
