"use client"

import { useState, useEffect } from "react"
import { fetchNewsPosts } from "@/lib/wordpress-api"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RefreshCcw } from "lucide-react"

export function NewsContent() {
  const [posts, setPosts] = useState([])
  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, endCursor: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true)
        setError(null)
        const { posts, pageInfo } = await fetchNewsPosts()
        setPosts(posts)
        setPageInfo(pageInfo)
      } catch (err) {
        console.error("Error loading news posts:", err)
        setError(err instanceof Error ? err : new Error("Failed to load news posts"))
      } finally {
        setLoading(false)
      }
    }

    loadPosts()
  }, [retryCount])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  if (loading) {
    return <NewsGridSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error loading news</AlertTitle>
          <AlertDescription>
            We couldn't load the latest news. This might be due to a network issue or server problem.
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button onClick={handleRetry} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
        </div>

        {/* Fallback content */}
        <div className="bg-white p-4 rounded-lg shadow-sm mt-6">
          <h2 className="text-xl font-semibold mb-4">While we're fixing this issue...</h2>
          <p className="mb-4">
            You can try refreshing the page or check back later. Our team has been notified of this issue.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6">Latest News</h1>
        {posts.length > 0 ? (
          <NewsGrid posts={posts} layout="vertical" />
        ) : (
          <p className="text-center py-8 text-gray-500">No news articles found.</p>
        )}
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
