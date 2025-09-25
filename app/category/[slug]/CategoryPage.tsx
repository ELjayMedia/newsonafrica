"use client"

import useSWRInfinite from "swr/infinite"
import { useSWRConfig } from "swr"
import { getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import { getCurrentCountry } from "@/lib/utils/routing"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useEffect, useMemo, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getBreadcrumbSchema, getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import Link from "next/link"
import Image from "next/image"
import { Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazy-load"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import type { Category, Post } from "@/types/content"

interface CategoryData {
  category: Category | null
  posts: Post[]
  hasNextPage: boolean
  endCursor: string | null
}

interface CategoryPageProps {
  slug: string
  initialData: CategoryData
}

export function CategoryPage({ slug, initialData }: CategoryPageProps) {
  const { ref, inView } = useInView()
  const { mutate } = useSWRConfig()

  const country = getCurrentCountry()

  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite(
    (index, previousPage) => {
      if (previousPage && !previousPage.hasNextPage) return null
      return ["category", country, slug, index]
    },
    () => getPostsByCategoryForCountry(country, slug, 20),
    {
      revalidateOnFocus: false,
      fallbackData: initialData ? [initialData] : undefined,
      dedupingInterval: 5 * 60 * 1000,
    },
  )

  const fetchNextPage = useCallback(() => setSize(size + 1), [size, setSize])
  const hasNextPage = data?.[data.length - 1]?.hasNextPage
  const isFetchingNextPage = isValidating && size > (data?.length || 0)

  // Prefetch related categories
  const prefetchRelatedCategories = useCallback(
    async (relatedSlugs: string[]) => {
      const prefetchPromises = relatedSlugs.slice(0, 3).map(async (relatedSlug) => {
        const data = await getPostsByCategoryForCountry(country, relatedSlug, 20)
        mutate(["category", country, relatedSlug, 0], [data], false)
      })
      await Promise.allSettled(prefetchPromises)
    },
    [mutate, country],
  )

  // Generate schema.org structured data (memoized)
  const schemas = useMemo(() => {
    if (!slug) return []

    const categoryUrl = `${siteConfig.url}${getCategoryUrl(slug, country)}`

    return [
      getBreadcrumbSchema([
        { name: "Home", url: siteConfig.url },
        { name: slug.charAt(0).toUpperCase() + slug.slice(1), url: categoryUrl },
      ]),
      getWebPageSchema(
        categoryUrl,
        `${slug.charAt(0).toUpperCase() + slug.slice(1)} - News On Africa`,
        initialData?.category?.description || `Latest articles in the ${slug} category`,
      ),
    ]
  }, [slug, country, initialData])

  // Memoize computed values with chronological sorting
  const pages = data ?? []
  const category = pages[0]?.category || initialData?.category || null
  const posts = pages.flatMap((page) => page.posts || [])
  const allPostsSorted = useMemo(
    () => posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [posts],
  )
  const featuredPosts = allPostsSorted.slice(0, 5)
  const morePosts = allPostsSorted.slice(5)

  // Find related categories from posts
  const relatedCategories = new Set<string>()
  allPostsSorted.forEach((post) => {
    post.categories.nodes.forEach((cat) => {
      if (cat.slug !== slug) {
        relatedCategories.add(cat.slug)
      }
    })
  })

  const relatedCategoriesArray = Array.from(relatedCategories).slice(0, 5)

  // Prefetch related categories when they're available
  useEffect(() => {
    if (relatedCategoriesArray.length > 0) {
      prefetchRelatedCategories(relatedCategoriesArray)
    }
  }, [relatedCategoriesArray, prefetchRelatedCategories])

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  if (isLoading && !initialData) {
    return <NewsGridSkeleton />
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm max-w-2xl mx-auto mt-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Category</h1>
        <p className="text-gray-700 mb-4">We encountered a problem loading this category: {(error as Error).message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!initialData || !initialData.category) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm max-w-2xl mx-auto mt-8">
        <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
        <p className="text-gray-700 mb-4">The category "{slug}" could not be found or has no posts.</p>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors inline-block"
        >
          Return Home
        </Link>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <SchemaOrg schemas={schemas} />
      <div className="space-y-8 px-4 py-8">
        {/* Category Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{category.name}</h1>
          {category.description && <p className="text-lg text-gray-600 max-w-3xl mx-auto">{category.description}</p>}

          {/* Related Categories */}
          {relatedCategoriesArray.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="text-sm text-gray-500">Related:</span>
              {relatedCategoriesArray.map((relatedSlug) => (
                <Link
                  key={relatedSlug}
                  href={getCategoryUrl(relatedSlug)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  {relatedSlug.charAt(0).toUpperCase() + relatedSlug.slice(1)}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Featured Posts Grid */}
        {featuredPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Latest Stories</h2>
            <NewsGrid
              posts={featuredPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
              layout="vertical"
            />
          </section>
        )}

        {/* More Posts */}
        {morePosts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-6">More from {category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {morePosts
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((post) => (
                  <Link
                    key={post.id}
                    href={getArticleUrl(post.slug)}
                    className="group flex flex-row items-center bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 min-h-[84px]"
                  >
                    <div className="flex-grow py-3 px-4 flex flex-col justify-center">
                      <h3 className="text-sm font-bold group-hover:text-blue-600 transition-colors duration-200">
                        {post.title}
                      </h3>
                      <div className="flex items-center text-gray-500 text-xs mt-2">
                        <Clock className="h-3 w-3 mr-1" />
                        <time dateTime={post.date}>{formatDate(post.date)}</time>
                      </div>
                    </div>
                    {post.featuredImage && (
                      <div className="relative w-[84px] h-[84px] flex-shrink-0 overflow-hidden rounded-lg self-center my-2 mr-3">
                        <Image
                          src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                          alt={post.title}
                          fill
                          sizes="84px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          placeholder="blur"
                          blurDataURL={generateBlurDataURL(84, 84)}
                        />
                      </div>
                    )}
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* Infinite scroll loading indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <div className="animate-pulse flex space-x-4">
              <div className="h-3 w-3 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="h-3 w-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="h-3 w-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </div>
        )}

        {/* Invisible sentinel element for infinite scroll */}
        {hasNextPage && <div ref={ref} className="h-10 w-full" aria-hidden="true" />}

        {/* End of content message */}
        {!hasNextPage && !isFetchingNextPage && allPostsSorted.length > 0 && (
          <p className="text-center text-gray-600 mt-8 py-4">You've reached the end of the {category.name} category</p>
        )}

        {/* No posts message */}
        {allPostsSorted.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No Posts Found</h3>
            <p className="text-gray-600 mb-4">There are currently no posts in the {category.name} category.</p>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors inline-block"
            >
              Browse All Posts
            </Link>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
