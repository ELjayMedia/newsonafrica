"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchRecentPosts } from "@/lib/wordpress-api"
import Link from "next/link"
import Image from "next/image"
import { Clock, RefreshCw } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useState, useEffect } from "react"
import { AdSense } from "@/components/AdSense"
import { AdErrorBoundary } from "./AdErrorBoundary"

// Function to get view counts (in production, replace with actual API call)
const getViewCounts = (posts) => {
  return posts.map((post) => ({
    ...post,
    viewCount: Math.floor(Math.random() * 1000), // Simulated view count
  }))
}

export function SidebarContent() {
  const [mostReadPosts, setMostReadPosts] = useState([])

  // Fetch recent posts from WordPress API
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["recentPosts"],
    queryFn: async () => {
      try {
        // Fetch posts from WordPress API
        const posts = await fetchRecentPosts(10)
        return posts
      } catch (error) {
        console.error("Error fetching recent posts:", error)
        throw error
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  })

  // Process posts to get most read posts
  useEffect(() => {
    if (data) {
      const postsWithViews = getViewCounts(data)
      const sortedPosts = postsWithViews.sort((a, b) => b.viewCount - a.viewCount).slice(0, 5)
      setMostReadPosts(sortedPosts)
    }
  }, [data])

  // Handle loading state
  if (isLoading) return <SidebarSkeleton />

  // Handle error state
  if (error) {
    console.error("Error in SidebarContent:", error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading sidebar content. Please try again later.</p>
        <button onClick={() => refetch()} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
          Retry
        </button>
      </div>
    )
  }

  return (
    <ErrorBoundary fallback={<SidebarSkeleton />}>
      <div className="space-y-6 w-full max-w-xs mx-auto lg:mx-0">
        {/* Most Read Section */}
        <section className="bg-white shadow-md rounded-lg p-4">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h2 className="text-xl font-bold">Most Read</h2>
          </div>
          <div className="space-y-4">
            {mostReadPosts.map((post, index) => (
              <Link key={post.id} href={`/post/${post.slug}`} className="flex items-start gap-3 group">
                <span className="text-2xl font-light text-gray-300 leading-tight">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold leading-tight group-hover:text-blue-600 line-clamp-2">
                    {post.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* AdSense ad between Most Read and Latest News */}
        <AdErrorBoundary collapse={true}>
          <AdSense slot="2584209442" format="vertical" className="w-full min-w-[300px]" />
        </AdErrorBoundary>

        {/* Latest News Section */}
        <section className="bg-white shadow-md rounded-lg p-4">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h2 className="text-xl font-bold">Latest News</h2>
            <button
              onClick={() => refetch()}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              aria-label="Refresh latest news"
              disabled={isFetching}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="space-y-4">
            {data?.slice(0, 5).map((post) => (
              <Link key={post.id} href={`/post/${post.slug}`} className="flex items-start gap-2 group">
                {post.featuredImage && post.featuredImage.node && (
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                      alt={post.title || "News article"}
                      width={64}
                      height={64}
                      className="rounded-sm object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold leading-tight group-hover:text-blue-600 line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                    <Clock className="h-3 w-3" />
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </time>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-2 border-t border-gray-100 text-center">
            <Link href="/news" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
              View all news
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  )
}

function SidebarSkeleton() {
  return (
    <div className="w-full md:w-80 space-y-8 animate-pulse">
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 mb-4">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-2 mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-sm"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
