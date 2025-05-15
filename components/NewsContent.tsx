"use client"

import { useState, useEffect } from "react"
import { fetchNewsPosts } from "@/lib/wordpress-api"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function NewsContent() {
  const [posts, setPosts] = useState([])
  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, endCursor: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPosts() {
      const { posts, pageInfo } = await fetchNewsPosts()
      setPosts(posts)
      setPageInfo(pageInfo)
      setLoading(false)
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
