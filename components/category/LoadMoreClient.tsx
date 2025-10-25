"use client"

import { useState, useTransition } from "react"
import type { PostListItemData } from "@/lib/data/post-list"
import { PostList } from "@/components/posts/PostList"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fetchCategoryPostsAction } from "@/app/actions/content"

interface LoadMoreClientProps {
  countryCode: string
  slug: string
  initialCursor: string | null
  hasNextPage: boolean
  pageSize?: number
  className?: string
}

export function LoadMoreClient({
  countryCode,
  slug,
  initialCursor,
  hasNextPage,
  pageSize = 10,
  className,
}: LoadMoreClientProps) {
  const [posts, setPosts] = useState<PostListItemData[]>([])
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [moreAvailable, setMoreAvailable] = useState(hasNextPage)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchMore = () => {
    if (!moreAvailable || isPending) {
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        const result = await fetchCategoryPostsAction({
          countryCode,
          slug,
          first: pageSize,
          after: cursor,
        })

        setPosts((previous) => [...previous, ...result.posts])
        setCursor(result.pageInfo.endCursor)
        setMoreAvailable(result.pageInfo.hasNextPage)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error")
      }
    })
  }

  if (!moreAvailable && posts.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      {posts.length > 0 && <PostList posts={posts} variant="compact" />}

      {error && (
        <p className="text-sm text-destructive">We couldn&apos;t load more articles: {error}</p>
      )}

      {moreAvailable && (
        <div className="flex justify-center">
          <Button onClick={fetchMore} disabled={isPending} variant="outline">
            {isPending ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}
