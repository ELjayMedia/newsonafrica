"use client"

import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import Link from "next/link"
import React from "react"
import { HomeAfterHeroAd } from "@/components/HomeAfterHeroAd"
import { HomeMidContentAd } from "@/components/HomeMidContentAd"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import { HomePageSkeleton } from "./HomePageSkeleton"
import { categoryConfigs, type CategoryConfig } from "@/config/homeConfig"
import type { Post } from "@/types/content"
import { useHomeData, type HomeData } from "@/hooks/useHomeData"
import { OfflineNotification } from "@/components/OfflineNotification"

interface HomeContentProps {
  initialPosts?: Post[]
  initialData?: HomeData
}

export function HomeContent({ initialPosts = [], initialData }: HomeContentProps) {
  const { data, error, isLoading, isOffline, categoryPosts } = useHomeData(
    initialPosts,
    initialData,
  )

  const {
    taggedPosts = [],
    featuredPosts = [],
    recentPosts = [],
  } = data

  if (isLoading && !initialData && !initialPosts.length) {
    return <HomePageSkeleton />
  }

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

  const mainStory = taggedPosts[0] || null
  const secondaryStories = taggedPosts.slice(1, 5) || []

  const CategorySection = ({ name, layout, typeOverride, showAdAfter }: CategoryConfig) => {
    const posts = categoryPosts[name] || []
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

  const schemas = [
    getWebPageSchema(
      siteConfig.url,
      "News On Africa - Where the Continent Connects",
      "A pan-African news platform providing comprehensive coverage across the continent",
    ),
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
        <OfflineNotification isOffline={isOffline} />

        {mainStory && (
          <section className="bg-gray-50 px-2 py-2 rounded-lg">
            <FeaturedHero post={mainStory} />
          </section>
        )}

        <HomeAfterHeroAd />

        {secondaryStories.length > 0 && (
          <section className="bg-white p-2 md:p-3 rounded-lg md:flex md:flex-col">
            <SecondaryStories posts={secondaryStories} layout="horizontal" />
          </section>
        )}

        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {categoryConfigs.map((config) => (
            <CategorySection key={config.name} {...config} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
