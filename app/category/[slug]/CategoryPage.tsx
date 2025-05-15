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
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

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
            <HorizontalCard key={post.id} post={post} />
          ))}

          {/* Infinite scroll loading indicator */}
          {isFetchingNextPage && (
            <div className="col-span-full flex justify-center py-4">
              <div className="animate-pulse flex space-x-4">
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Invisible sentinel element for infinite scroll */}
        {hasNextPage && <div ref={ref} className="h-10 w-full" aria-hidden="true" />}

        {/* End of content message */}
        {!hasNextPage && !isFetchingNextPage && morePosts.length > 0 && (
          <p className="text-center text-gray-600 mt-8">You've reached the end of the content</p>
        )}
      </div>
    </ErrorBoundary>
  )
}
