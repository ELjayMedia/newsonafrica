"use client"

import { useState, useEffect } from "react"
import { fetchBusinessPosts } from "@/lib/wordpress-api"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSkeletonLoader } from "@/hooks/useSkeleton"

export function BusinessContent() {
  const [posts, setPosts] = useState([])
  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, endCursor: null })
  const { isLoading, setLoading } = useSkeletonLoader({ minDisplayTime: 1000 })

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true)
        const data = await fetchBusinessPosts()
        setPosts(data?.posts || [])
        setPageInfo(data?.pageInfo || { hasNextPage: false, endCursor: null })
      } catch (error) {
        console.error("Error loading business posts:", error)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [setLoading])

  return (
    <div className="space-y-8">
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6">Business News</h1>
        {isLoading ? (
          <NewsGridSkeleton />
        ) : posts.length > 0 ? (
          <NewsGrid posts={posts} layout="vertical" />
        ) : (
          <p className="text-center py-8">No business news articles found.</p>
        )}
      </section>

      {pageInfo.hasNextPage && !isLoading && (
        <div className="flex justify-center">
          <Button asChild>
            <Link href={`/business?after=${pageInfo.endCursor}`}>Load More</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
