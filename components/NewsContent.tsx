"use client"

import { useState, useEffect } from "react"
import { fetchNewsPosts } from "@/lib/wordpress-api"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSkeletonLoader } from "@/hooks/useSkeleton"

export function NewsContent() {
  const [posts, setPosts] = useState([])
  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, endCursor: null })
  const { isLoading, setLoading } = useSkeletonLoader({ minDisplayTime: 1000 })

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true)
        const { posts, pageInfo } = await fetchNewsPosts()
        setPosts(posts)
        setPageInfo(pageInfo)
      } catch (error) {
        console.error("Error loading news posts:", error)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [setLoading])

  return (
    <div className="space-y-8">
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6">Latest News</h1>
        {isLoading ? <NewsGridSkeleton /> : <NewsGrid posts={posts} layout="vertical" />}
      </section>

      {pageInfo.hasNextPage && !isLoading && (
        <div className="flex justify-center">
          <Button asChild>
            <Link href={`/news?after=${pageInfo.endCursor}`}>Load More</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
