"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchRecentPosts, fetchMostReadPosts } from "@/lib/wordpress"
import Link from "next/link"
import Image from "next/image"
import { Clock, AlertCircle } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { AdSense } from "@/components/AdSense"
import { AdErrorBoundary } from "./AdErrorBoundary"
import { SidebarSkeleton } from "./SidebarSkeleton"

export function SidebarContent() {

  const limit = 10
  const { data: mostReadPosts, isLoading: mostReadLoading, error: mostReadError } =
    useQuery({
      queryKey: ["mostReadPosts", limit],
      queryFn: () => fetchMostReadPosts(limit),
      staleTime: 1000 * 60 * 5,
    })

  const { data: recentPosts, isLoading: recentLoading, error: recentError } = useQuery({
    queryKey: ["recentPosts", limit],
    queryFn: () => fetchRecentPosts(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  if (mostReadLoading || recentLoading) return <SidebarSkeleton />

  if (mostReadError || recentError) {
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
  if (!mostReadPosts || !recentPosts || mostReadPosts.length === 0 || recentPosts.length === 0) {
    return (
      <div className="space-y-6">
        <section className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Most Read</h2>
          <p className="text-gray-500 text-sm py-4 text-center">No articles available at this time.</p>
        </section>

        <AdErrorBoundary collapse={true}>
          <AdSense slot="2584209442" format="vertical" className="w-full min-w-[300px]" />
        </AdErrorBoundary>

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
                <Link key={post.id} href={`/post/${post.slug}`} className="flex items-start gap-3 group">
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

        {/* AdSense ad between Most Read and Latest News */}
        <AdErrorBoundary collapse={true}>
          <AdSense slot="2584209442" format="vertical" className="w-full min-w-[300px]" />
        </AdErrorBoundary>

        {/* Latest News Section */}
        <section className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Latest News</h2>
          {recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts.slice(0, 5).map((post) => (
                <Link key={post.id} href={`/post/${post.slug}`} className="flex items-start gap-2 group">
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
