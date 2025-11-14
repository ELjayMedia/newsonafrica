"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"

import { FeaturedHeroClient as FeaturedHero } from "@/components/client/FeaturedHeroClient"
import { SecondaryStoriesClient as SecondaryStories } from "@/components/client/SecondaryStoriesClient"
import { NewsGridClient as NewsGrid } from "@/components/client/NewsGridClient"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SchemaOrg } from "@/components/SchemaOrg"
import { CountryNavigation, CountrySpotlight } from "@/components/CountryNavigation"
import { siteConfig } from "@/config/site"
import { categoryConfigs, type CategoryConfig } from "@/config/homeConfig"
import { getWebPageSchema } from "@/lib/schema"
import { getArticleUrl, getCategoryUrl, getCurrentCountry } from "@/lib/utils/routing"
import type { Category } from "@/types/content"
import type { CountryPosts, HomePost } from "@/types/home"

export interface HomeContentClientProps {
  initialPosts?: HomePost[]
  countryPosts?: CountryPosts
  featuredPosts?: HomePost[]
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

const resolveCategorySlug = (config: CategoryConfig) => config.typeOverride ?? config.name

const mapCategoryPostsForConfigs = (
  configs: CategoryConfig[],
  categoryPostsBySlug?: Record<string, HomePost[]>,
): Record<string, HomePost[]> => {
  if (!categoryPostsBySlug) {
    return {}
  }

  return configs.reduce<Record<string, HomePost[]>>((acc, config) => {
    const resolvedSlug = resolveCategorySlug(config)
    const normalizedSlug = resolvedSlug.toLowerCase()
    const posts = categoryPostsBySlug[normalizedSlug] ?? categoryPostsBySlug[resolvedSlug]

    if (posts?.length) {
      acc[normalizedSlug] = posts
    }

    return acc
  }, {})
}

const buildFallbackData = (
  baselinePosts: HomePost[],
  featuredPosts: HomePost[],
): Required<HomeContentClientProps["initialData"]> => {
  if (baselinePosts.length === 0 && featuredPosts.length === 0) {
    return {
      taggedPosts: [],
      featuredPosts: [],
      categories: [],
      recentPosts: [],
      categoryPosts: {},
    }
  }

  const fallbackPosts = baselinePosts.length > 0 ? baselinePosts : featuredPosts

  return {
    taggedPosts: fallbackPosts.slice(0, 8),
    featuredPosts: featuredPosts.length > 0 ? featuredPosts.slice(0, 6) : fallbackPosts.slice(0, 6),
    categories: [],
    recentPosts: fallbackPosts.slice(0, 10),
    categoryPosts: {},
  }
}

export function HomeContentClient({
  initialPosts = [],
  countryPosts = {},
  featuredPosts = [],
  initialData,
}: HomeContentClientProps) {
  const [isOffline, setIsOffline] = useState(!isOnline())

  const currentCountry = getCurrentCountry()
  const initialCountryPosts = countryPosts[currentCountry] || initialPosts
  const baselinePosts = initialCountryPosts.length ? initialCountryPosts : initialPosts

  const resolvedData = useMemo(() => {
    if (initialData) {
      return {
        ...initialData,
        categoryPosts: initialData.categoryPosts ?? {},
      }
    }

    return buildFallbackData(baselinePosts, featuredPosts)
  }, [baselinePosts, featuredPosts, initialData])

  const categoryPosts = useMemo(
    () => mapCategoryPostsForConfigs(categoryConfigs, resolvedData.categoryPosts),
    [resolvedData.categoryPosts],
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

  const {
    taggedPosts = [],
    featuredPosts: fetchedFeaturedPosts = [],
    categories: _categories = [],
    recentPosts = [],
  } = resolvedData

  const finalFeaturedPosts = featuredPosts.length > 0 ? featuredPosts : fetchedFeaturedPosts

  const heroSource = taggedPosts.length > 0 ? taggedPosts : finalFeaturedPosts.length > 0 ? finalFeaturedPosts : recentPosts
  const mainStory = heroSource[0] || null
  const secondaryStories = heroSource.slice(1, 5)

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
        finalFeaturedPosts?.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteConfig.url}${getArticleUrl(post.slug, (post as any)?.country)}`,
          name: post.title,
        })) || [],
    },
  ]

  const CategorySection = (config: CategoryConfig) => {
    const { name, layout, typeOverride } = config
    const resolvedSlug = resolveCategorySlug(config)
    const normalizedSlug = resolvedSlug.toLowerCase()
    const posts = categoryPosts[normalizedSlug] || []

    if (posts.length === 0) return null

    return (
      <section key={normalizedSlug} className="bg-white rounded-lg">
        <h2 className="text-lg md:text-xl font-bold capitalize mb-3">
          <Link
            href={getCategoryUrl(normalizedSlug)}
            className="hover:text-blue-600 transition-colors"
          >
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

  const offlineNotification = isOffline ? (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3" role="status" aria-live="polite">
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
  ) : null

  let content: ReactNode

  if (!taggedPosts.length && !finalFeaturedPosts.length && !recentPosts.length) {
    content = (
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
  } else if (!heroSource.length) {
    content = (
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
  } else {
    content = (
      <div className="space-y-3 md:space-y-4 pb-16 md:pb-4">
        {offlineNotification}

        <CountryNavigation />

        {mainStory && (
          <section className="bg-gray-50 px-2 py-2 rounded-lg">
            <FeaturedHero post={mainStory} />
          </section>
        )}

        <CountrySpotlight countryPosts={countryPosts} />

        {secondaryStories.length > 0 && (
          <section className="bg-white p-2 md:p-3 rounded-lg md:flex md:flex-col">
            <SecondaryStories posts={secondaryStories} layout="horizontal" />
          </section>
        )}

        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {categoryConfigs.map((config) => {
            const normalizedSlug = resolveCategorySlug(config).toLowerCase()
            return <CategorySection key={normalizedSlug} {...config} />
          })}
        </div>
      </div>
    )
  }
  return (
    <ErrorBoundary>
      <SchemaOrg schemas={schemas} />
      {content}
    </ErrorBoundary>
  )
}
