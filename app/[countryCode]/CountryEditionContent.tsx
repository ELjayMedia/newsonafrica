"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  getLatestPostsForCountry,
  getCategoriesForCountry,
  getPostsForCategories,
  getFpTaggedPostsForCountry,
  mapPostsToHomePosts,
  COUNTRIES,
  type CountryConfig,
  type WordPressPost,
} from "@/lib/wordpress-api"
import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { ArticleCard } from "@/components/ArticleCard"
import { ArticleList } from "@/components/ArticleList"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, TrendingUp, Clock, Grid3X3, Plus, MapPin } from "lucide-react"
import Link from "next/link"
import { getCategoryUrl } from "@/lib/utils/routing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CountryPosts, HomePost } from "@/types/home"

interface CountryEditionContentProps {
  countryCode: string
  country: CountryConfig
}

export function CountryEditionContent({ countryCode, country }: CountryEditionContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryPosts, setCategoryPosts] = useState<Record<string, HomePost[]>>({})
  const [panAfricanPosts, setPanAfricanPosts] = useState<CountryPosts>({})

  const {
    data: fpData,
    error: fpError,
    isLoading: fpLoading,
  } = useSWR([`fp-tagged`, countryCode], () => getFpTaggedPostsForCountry(countryCode, 8), {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  // Fetch hero/featured posts (first 3 latest posts as fallback)
  const {
    data: heroData,
    error: heroError,
    isLoading: heroLoading,
  } = useSWR([`hero`, countryCode], () => getLatestPostsForCountry(countryCode, 3), {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

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
  } = useSWR(`categories-${countryCode}`, () => getCategoriesForCountry(countryCode), {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  })

  const heroSource = fpData && fpData.length > 0 ? fpData : heroData?.posts || []
  const heroPost = heroSource[0]
  const secondaryStories = heroSource.slice(1, 5)
  const trendingPosts = trendingData?.posts || []
  const latestPosts = latestData?.posts || []
  const moreForYouInitialData = latestData
    ? {
        posts: latestData.posts.slice(8),
        hasNextPage: latestData.hasNextPage,
        endCursor: latestData.endCursor,
      }
    : undefined

  useEffect(() => {
    let isCancelled = false

    const fetchCategoryPosts = async () => {
      try {
        console.log("[v0] Fetching category posts for country:", countryCode)
        const slugs = ["news", "business", "sport", "entertainment", "life", "health", "politics", "food", "opinion"]
        const batchedPosts = await getPostsForCategories(countryCode, slugs, 5)

        if (isCancelled) return

        const mappedPosts: Record<string, HomePost[]> = {}

        slugs.forEach((slug) => {
          const categoryData = batchedPosts[slug]
          if (categoryData?.posts?.length) {
            mappedPosts[slug] = mapPostsToHomePosts(categoryData.posts as WordPressPost[], countryCode)
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
  }, [countryCode])

  useEffect(() => {
    let isCancelled = false

    const fetchPanAfricanPosts = async () => {
      try {
        const allCountries = Object.keys(COUNTRIES)
        const otherCountries = allCountries.filter((code) => code !== countryCode).slice(0, 3)

        const results = await Promise.allSettled(
          otherCountries.map(async (code) => {
            const result = await getLatestPostsForCountry(code, 2)
            return {
              countryCode: code,
              posts: mapPostsToHomePosts(result.posts || [], code),
            }
          }),
        )

        if (isCancelled) return

        const newCountryPosts: CountryPosts = {}

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value.posts.length > 0) {
            newCountryPosts[result.value.countryCode] = result.value.posts
          }
        })

        setPanAfricanPosts(newCountryPosts)
      } catch (error) {
        console.error("[v0] Error fetching Pan-African posts:", error)
      }
    }

    fetchPanAfricanPosts()

    return () => {
      isCancelled = true
    }
  }, [countryCode])

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
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 w-8 bg-primary rounded-full" />
          <h2 className="text-2xl font-bold">Featured Story</h2>
        </div>

        {fpLoading || heroLoading ? (
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
          <div className="bg-gray-50 px-2 py-2 rounded-lg">
            <FeaturedHero post={heroPost} />
          </div>
        ) : null}
      </section>

      {secondaryStories.length > 0 && (
        <section className="bg-white p-2 md:p-3 rounded-lg">
          <SecondaryStories posts={secondaryStories} layout="horizontal" />
        </section>
      )}

      {Object.keys(panAfricanPosts).length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Pan-African Spotlight</h2>
            <Badge variant="secondary" className="ml-2">
              Pan-African
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Discover the latest stories from across the African continent</p>

          <div className="flex overflow-x-auto gap-6 pb-4 scroll-smooth snap-x snap-mandatory">
            {Object.entries(panAfricanPosts).map(([code, posts]) => {
              const spotlightCountry = COUNTRIES[code]
              if (!spotlightCountry || !posts || posts.length === 0) return null

              return (
                <Card
                  key={code}
                  className="flex-none w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[300px] overflow-hidden hover:shadow-lg transition-shadow snap-start"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label={`${spotlightCountry.name} flag`}>
                        {spotlightCountry.flag}
                      </span>
                      <CardTitle className="text-lg">{spotlightCountry.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {posts.slice(0, 2).map((post) => (
                      <Link key={post.id} href={`/${code}/article/${post.slug}`} className="block group">
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(post.date).toLocaleDateString()}</p>
                      </Link>
                    ))}
                    <Link
                      href={`/${code}`}
                      className="inline-flex items-center text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      View all {spotlightCountry.name} news
                      <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

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

      {Object.keys(categoryPosts).length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Browse by Category</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {Object.entries(categoryPosts).map(([categorySlug, posts]) => {
              if (!posts || posts.length === 0) return null

              return (
                <div key={categorySlug} className="bg-white rounded-lg p-4">
                  <h3 className="text-lg md:text-xl font-bold capitalize mb-4">
                    <Link
                      href={getCategoryUrl(categorySlug, countryCode)}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {categorySlug}
                    </Link>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.slice(0, 3).map((post) => (
                      <ArticleCard key={post.id} article={post} layout="compact" />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Categories Rail */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">All Categories</h2>
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
              <Link key={category.id} href={getCategoryUrl(category.slug, countryCode)} className="flex-shrink-0">
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
          initialData={moreForYouInitialData}
          layout="standard"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        />
      </section>
    </div>
  )
}
