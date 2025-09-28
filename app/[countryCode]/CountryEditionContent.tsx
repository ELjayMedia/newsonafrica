"use client"

import { useState } from "react"
import useSWR from "swr"
import { getLatestPostsForCountry, getCategoriesForCountry, type CountryConfig } from "@/lib/wordpress-api"
import { ArticleCard } from "@/components/ArticleCard"
import { ArticleList } from "@/components/ArticleList"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, TrendingUp, Clock, Grid3X3, Plus, MapPin } from "lucide-react"
import Link from "next/link"
import { getCategoryUrl } from "@/lib/utils/routing"
import { ElegantArticleList } from "@/components/ElegantArticleList"
import { ElegantHero } from "@/components/ElegantHero"

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
    [`hero`, countryCode],
    () => getLatestPostsForCountry(countryCode, 3),
    { revalidateOnFocus: false, dedupingInterval: 300000 }, // 5 minutes
  )

  const {
    data: trendingData,
    error: trendingError,
    isLoading: trendingSWRLoading,
  } = useSWR(
    heroData?.endCursor ? [`trending`, countryCode, heroData.endCursor] : null,
    ([, code, cursor]) => getLatestPostsForCountry(code, 7, cursor),
    { revalidateOnFocus: false, dedupingInterval: 300000 },
  )

  const {
    data: latestData,
    error: latestError,
    isLoading: latestSWRLoading,
  } = useSWR(
    trendingData?.endCursor ? [`latest`, countryCode, trendingData.endCursor] : null,
    ([, code, cursor]) => getLatestPostsForCountry(code, 20, cursor),
    { revalidateOnFocus: false, dedupingInterval: 300000 },
  )

  const trendingLoading = heroLoading || trendingSWRLoading
  const latestLoading = trendingLoading || latestSWRLoading

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
  const moreForYouInitialData = latestData
    ? {
        posts: latestData.posts.slice(8),
        hasNextPage: latestData.hasNextPage,
        endCursor: latestData.endCursor,
      }
    : undefined

  // Error state
  if (heroError && trendingError && latestError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load content for {country.name}. Please try again later.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="press-layout">
      {/* Country Header */}
      <section className="bg-earth-dark text-earth-dark-foreground py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl" role="img" aria-label={`${country.name} flag`}>
              {country.flag}
            </span>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold">{country.name} Edition</h1>
              <p className="text-earth-light text-lg mt-2">Latest news and updates from {country.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-earth-light">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Part of News On Africa's pan-continental coverage</span>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      {heroLoading ? (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : heroPost ? (
        <ElegantHero post={heroPost} />
      ) : null}

      {/* Featured Stories */}
      {featuredPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <ElegantArticleList posts={featuredPosts} title="Featured Stories" showCategory={true} />
        </section>
      )}

      {/* Categories Navigation */}
      <section className="bg-muted/20 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Grid3X3 className="h-6 w-6 text-earth-warm" />
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-earth-dark">Browse Categories</h2>
            </div>
            <p className="text-muted-foreground">Explore news by topic in {country.name}</p>
          </div>

          {categoriesLoading ? (
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-full" />
              ))}
            </div>
          ) : categoriesError ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load categories. Using default navigation.</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {categories?.slice(0, 12).map((category) => (
                <Link key={category.id} href={getCategoryUrl(category.slug, countryCode)}>
                  <Badge
                    variant="secondary"
                    className="hover:bg-earth-warm hover:text-earth-warm-foreground transition-colors cursor-pointer px-4 py-2 text-sm"
                  >
                    {category.name}
                    {category.count && <span className="ml-2 text-xs opacity-70">{category.count}</span>}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Now */}
      {trendingPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <TrendingUp className="h-6 w-6 text-earth-warm" />
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-earth-dark">Trending Now</h2>
            </div>
            <p className="text-muted-foreground">Most popular stories from {country.name}</p>
          </div>

          {trendingLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {trendingPosts.slice(0, 6).map((post) => (
                <ArticleCard key={post.id} article={post} layout="standard" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Latest News */}
      {latestPosts.length > 0 && (
        <section className="bg-muted/20 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-earth-warm" />
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-earth-dark">Latest News</h2>
              </div>
              <p className="text-muted-foreground">Recent updates from {country.name}</p>
            </div>

            {latestLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {latestPosts.slice(0, 8).map((post) => (
                  <ArticleCard key={post.id} article={post} layout="compact" />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* More Stories - Infinite Scroll */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Plus className="h-6 w-6 text-earth-warm" />
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-earth-dark">More Stories</h2>
          </div>
          <p className="text-muted-foreground">Discover more news from {country.name}</p>
        </div>

        <ArticleList
          fetcher={(cursor) => getLatestPostsForCountry(countryCode, 20, cursor)}
          initialData={moreForYouInitialData}
          layout="standard"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        />
      </section>
    </div>
  )
}
