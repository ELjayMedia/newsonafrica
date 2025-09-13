"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchRecentPosts } from "@/lib/wordpress-api"
import Link from "next/link"
import Image from "next/image"
import { Clock, AlertCircle } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useState, useEffect } from "react"
import { getArticleUrl } from "@/lib/utils/routing"

// Function to get view counts for posts
const getViewCounts = (posts) => {
  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return []
  }

  const twentyDaysAgo = new Date()
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

  return posts
    .filter((post) => {
      const postDate = new Date(post.date)
      return postDate >= twentyDaysAgo
    })
    .map((post) => ({
      ...post,
      viewCount: Math.floor(Math.random() * 1000), // Simulated view count
    }))
}

export function SidebarContent() {
  const [mostReadPosts, setMostReadPosts] = useState([])

  const { data, isLoading, error } = useQuery({
    queryKey: ["recentPosts"],
    queryFn: () => fetchRecentPosts(10),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  useEffect(() => {
    if (data) {
      const postsWithViews = getViewCounts(data)
      const sortedPosts = postsWithViews.sort((a, b) => b.viewCount - a.viewCount).slice(0, 5)
      setMostReadPosts(sortedPosts)
    }
  }, [data])

  if (isLoading) return <SidebarSkeleton />

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="font-medium text-red-800">Error loading content</h3>
        </div>
        <p className="text-sm text-red-700">Please try again later.</p>
      </div>
    )
  }

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <section className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Most Read</h2>
          <p className="text-gray-500 text-sm py-4 text-center">No articles available at this time.</p>
        </section>


        <section className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Latest News</h2>
          <p className="text-gray-500 text-sm py-4 text-center">No articles available at this time.</p>
        </section>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Most Read Section */}
        <section className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Most Read</h2>
          {mostReadPosts.length > 0 ? (
            <div className="space-y-4">
              {mostReadPosts.map((post, index) => (
                <Link key={post.id} href={getArticleUrl(post.slug)} className="flex items-start gap-3 group">
                  <span className="text-2xl font-light text-gray-300 leading-tight">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-tight group-hover:text-blue-600">{post.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-4 text-center">No articles available at this time.</p>
          )}
        </section>


        {/* Latest News Section */}
        <section className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Latest News</h2>
          {data.length > 0 ? (
            <div className="space-y-4">
              {data.slice(0, 5).map((post) => (
                <Link key={post.id} href={getArticleUrl(post.slug)} className="flex items-start gap-2 group">
                  {post.featuredImage && post.featuredImage.node && (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={post.featuredImage.node.sourceUrl || "/placeholder.png"}
                        alt={post.title}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-sm"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-tight group-hover:text-blue-600">{post.title}</h3>
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
          ) : (
            <p className="text-gray-500 text-sm py-4 text-center">No articles available at this time.</p>
          )}
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
