"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { getPostsByCategory } from "@/lib/api/wordpress"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import ErrorBoundary from "@/components/ErrorBoundary"
import { CategoryAd } from "@/components/CategoryAd"
import { useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getBreadcrumbSchema, getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import Link from "next/link"
import Image from "next/image"
import { Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazyLoad"
import type { WordPressCategory, WordPressPost } from "@/lib/api/wordpress"

interface CategoryData {
  category: WordPressCategory | null
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}

interface CategoryPageProps {
  slug: string
  initialData: CategoryData
}

export function CategoryPage({ slug, initialData }: CategoryPageProps) {
  const { ref, inView } = useInView()

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["category", slug],
    queryFn: ({ pageParam = null }) => getPostsByCategory(slug, 20, pageParam),
    getNextPageParam: (lastPage) => (lastPage?.hasNextPage ? lastPage.endCursor : undefined),
    initialPageParam: null,
    initialData: initialData
      ? {
          pages: [initialData],
          pageParams: [null],
        }
      : undefined,
  })

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

  if (!data || data.pages.length === 0 || !data.pages[0]?.category) {
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

  const category = data.pages[0].category
  const allPosts = data.pages.flatMap((page) => page.posts)

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
        {/* Category Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{category.name}</h1>
          {category.description && <p className="text-lg text-gray-600 max-w-3xl mx-auto">{category.description}</p>}
        </div>

        {/* Featured Posts Grid */}
        {featuredPosts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Featured Stories</h2>
            <NewsGrid posts={featuredPosts} layout="vertical" />
          </section>
        )}

        {/* Advertisement */}
        <CategoryAd />

        {/* More Posts */}
        {morePosts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-6">More from {category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {morePosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.slug}`}
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
        {!hasNextPage && !isFetchingNextPage && allPosts.length > 0 && (
          <p className="text-center text-gray-600 mt-8 py-4">You've reached the end of the {category.name} category</p>
        )}

        {/* No posts message */}
        {allPosts.length === 0 && (
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
