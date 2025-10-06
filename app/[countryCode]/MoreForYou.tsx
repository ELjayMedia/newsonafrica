"use client"

import { ArticleList } from "@/components/ArticleList"
import { getLatestPostsForCountry } from "@/lib/wordpress-api"
import type { HomePost } from "@/types/wordpress"

interface MoreForYouProps {
  countryCode: string
  initialData?: {
    posts: HomePost[]
    hasNextPage: boolean
    endCursor: string | null
  }
}

export function MoreForYou({ countryCode, initialData }: MoreForYouProps) {
  const fetchMorePosts = async (cursor?: string | null) => {
    const result = await getLatestPostsForCountry(countryCode, 20, cursor || undefined)
    return {
      posts: result.posts,
      hasNextPage: result.hasNextPage,
      endCursor: result.endCursor,
    }
  }

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-6">More For You</h2>
      <ArticleList initialData={initialData} fetcher={fetchMorePosts} emptyMessage="No more articles available" />
    </section>
  )
}
