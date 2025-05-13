"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchCategoryPosts } from "@/lib/wordpress-api"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import ErrorBoundary from "@/components/ErrorBoundary"
import { CategoryAd } from "@/components/CategoryAd"
import { HorizontalCard } from "@/components/HorizontalCard"
import { useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getBreadcrumbSchema, getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"

export default function CategoryPage({ slug, initialData }: { slug: string; initialData: any }) {
  const { ref, inView } = useInView()

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["category", slug],
    queryFn: ({ pageParam = null }) => fetchCategoryPosts(slug, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage?.posts.pageInfo.hasNextPage ? lastPage.posts.pageInfo.endCursor : undefined,
    initialPageParam: null,
    initialData: initialData ? { pages: [initialData], pageParams: [null] } : undefined,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage, isFetchingNextPage])

  if (isLoading) return <NewsGridSkeleton />
  if (error) return <div>Error loading category: {(error as Error).message}</div>
  if (!data || data.pages.length === 0) return <div>No posts found for this category.</div>

  const category = data.pages[0]
  const allPosts = data.pages.flatMap((page) => page.posts.nodes)

  const featuredPosts = allPosts.slice(0, 5)
  const morePosts = allPosts.slice(5)

  // Create the full URL for the category
  const categoryUrl = `${siteConfig.url}/category/${slug}`

  // Generate schema.org structured data
  const schemas = [
    // BreadcrumbList schema
    getBreadcrumbSchema([
      { name: "Home", url: siteConfig.url },
      { name: category.name, url: categoryUrl },
    ]),

    // WebPage schema
    getWebPageSchema(
      categoryUrl,
      `${category.name} - News On Africa`,
      category.description || `Latest articles in the ${category.name} category`,
    ),
  ]

  return (
    <ErrorBoundary>
      <SchemaOrg schemas={schemas} />
      <div className="space-y-8 px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{category.name}</h1>
        {category.description && <p className="text-lg text-gray-600 mb-8">{category.description}</p>}

        <NewsGrid posts={featuredPosts} layout="vertical" />

        <CategoryAd />

        <h2 className="text-xl font-bold mt-12 mb-6">More from {category.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {morePosts.map((post) => (
            <HorizontalCard key={post.id} post={post} showBookmarkButton />
          ))}

          {/* Improved loading skeletons for infinite scroll */}
          {isFetchingNextPage && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={`skeleton-${i}`} className="border border-gray-200 rounded-lg shadow-sm p-3 animate-pulse">
                  <div className="flex flex-row items-center justify-between space-x-3">
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-gray-200 rounded-full mr-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="w-20 h-20 bg-gray-200 rounded-md"></div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Improved sentinel with loading trigger */}
        <div ref={ref} className="w-full py-8 flex justify-center" aria-live="polite" role="status">
          {hasNextPage && !isFetchingNextPage && (
            <button
              onClick={() => fetchNextPage()}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors"
            >
              Load more articles
            </button>
          )}

          {isFetchingNextPage && (
            <div className="text-gray-500 flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading more articles...
            </div>
          )}

          {!hasNextPage && morePosts.length > 0 && (
            <p className="text-center text-gray-600">You've reached the end of the content</p>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
