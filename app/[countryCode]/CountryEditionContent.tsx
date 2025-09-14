"use client"

import { useState } from "react"
import useSWR from "swr"
import { getLatestPostsForCountry, getCategoriesForCountry, type CountryConfig } from "@/lib/wordpress-api"
import { ArticleCard } from "@/components/ArticleCard"
import { ArticleList } from "@/components/ArticleList"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, TrendingUp, Clock, Grid3X3, Plus } from "lucide-react"
import Link from "next/link"

interface CountryEditionContentProps {
  countryCode: string
  country: CountryConfig
}

export function CountryEditionContent({ countryCode, country }: CountryEditionContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Fetch hero/featured posts (first 3 latest posts)
  const {
    data: heroData,
    error: heroError,
    isLoading: heroLoading,
  } = useSWR(
    `hero-${countryCode}`,
    () => getLatestPostsForCountry(countryCode, 3),
    { revalidateOnFocus: false, dedupingInterval: 300000 }, // 5 minutes
  )

  // Fetch trending posts (posts 4-10)
  const {
    data: trendingData,
    error: trendingError,
    isLoading: trendingLoading,
  } = useSWR(
    `trending-${countryCode}`,
    () => getLatestPostsForCountry(countryCode, 7, heroData?.endCursor || undefined),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      // Only fetch after hero data is loaded
      ...(heroData && { refreshInterval: 0 }),
    },
  )

  // Fetch latest posts (posts 11-30)
  const {
    data: latestData,
    error: latestError,
    isLoading: latestLoading,
  } = useSWR(
    `latest-${countryCode}`,
    () => getLatestPostsForCountry(countryCode, 20, trendingData?.endCursor || undefined),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      // Only fetch after trending data is loaded
      ...(trendingData && { refreshInterval: 0 }),
    },
  )

  // Fetch categories
  const {
    data: categories,
    error: categoriesError,
    isLoading: categoriesLoading,
  } = useSWR(
    `categories-${countryCode}`,
    () => getCategoriesForCountry(countryCode),
    { revalidateOnFocus: false, dedupingInterval: 600000 }, // 10 minutes
  )

  const heroPost = heroData?.posts[0]
  const featuredPosts = heroData?.posts.slice(1, 3) || []
  const trendingPosts = trendingData?.posts || []
  const latestPosts = latestData?.posts || []

  // Error state
  if (heroError && trendingError && latestError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load content for {country.name}. Please try again later.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 w-8 bg-primary rounded-full" />
          <h2 className="text-2xl font-bold">Featured Story</h2>
        </div>

        {heroLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video w-full mb-4" />
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
        ) : heroPost ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Hero Post */}
            <div className="lg:col-span-2">
              <ArticleCard article={heroPost} layout="featured" className="h-full" />
            </div>

            {/* Side Featured Posts */}
            <div className="space-y-4">
              {featuredPosts.map((post) => (
                <ArticleCard key={post.id} article={post} layout="compact" />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Trending Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Trending Now</h2>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-video w-full mb-3" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingPosts.slice(0, 6).map((post) => (
              <ArticleCard key={post.id} article={post} layout="standard" />
            ))}
          </div>
        )}
      </section>

      {/* Categories Rail */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Browse Categories</h2>
        </div>

        {categoriesLoading ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
            ))}
          </div>
        ) : categoriesError ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load categories. Using default navigation.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories?.slice(0, 10).map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`} className="flex-shrink-0">
                <Badge
                  variant="secondary"
                  className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                >
                  {category.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Latest News */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Latest News</h2>
        </div>

        {latestLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {latestPosts.slice(0, 8).map((post) => (
              <ArticleCard key={post.id} article={post} layout="compact" />
            ))}
          </div>
        )}
      </section>

      {/* More for You - Infinite Scroll */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">More for You</h2>
        </div>

        <ArticleList
          fetcher={(cursor) => getLatestPostsForCountry(countryCode, 20, cursor)}
          initialData={latestData}
          layout="standard"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        />
      </section>
    </div>
  )
}
