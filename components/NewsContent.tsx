"use client"

import { useState, useEffect } from "react"
import { fetchNewsPosts } from "@/lib/wordpress-api"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Use dynamic import for NewsGrid to ensure it's only loaded on the client
const NewsGrid = dynamic(
  () =>
    import("@/components/NewsGrid").then((mod) => ({
      default: mod.NewsGrid,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>,
  },
)

// Use dynamic import for NewsGridSkeleton
const NewsGridSkeleton = dynamic(() => import("@/components/NewsGridSkeleton").then((mod) => mod.NewsGridSkeleton), {
  ssr: false,
})

export function NewsContent() {
  const [posts, setPosts] = useState([])
  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, endCursor: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPosts() {
      try {
        const { posts, pageInfo } = await fetchNewsPosts()
        setPosts(posts)
        setPageInfo(pageInfo)
      } catch (error) {
        console.error("Error loading posts:", error)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [])

  if (loading) {
    return <NewsGridSkeleton />
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6">Latest News</h1>
        <NewsGrid posts={posts} layout="vertical" />
      </section>

      {pageInfo.hasNextPage && (
        <div className="flex justify-center">
          <Button asChild>
            <Link href={`/news?after=${pageInfo.endCursor}`}>Load More</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

// Add a default export for dynamic import
export default { NewsContent }
