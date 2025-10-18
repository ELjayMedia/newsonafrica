"use client"

import { useMemo, useState, useTransition } from "react"
import type { PostListItemData } from "@/lib/data/post-list"
import { PostList } from "@/components/posts/PostList"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LoadMoreClientProps {
  countryCode: string
  slug: string
  initialCursor: string | null
  hasNextPage: boolean
  pageSize?: number
  className?: string
}

interface LoadMoreResponse {
  posts: PostListItemData[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
}

const buildEndpoint = (countryCode: string, slug: string, after: string | null, first: number) => {
  const params = new URLSearchParams({ first: String(first) })
  if (after) {
    params.set("after", after)
  }
  return `/api/category/${countryCode}/${slug}/posts?${params.toString()}`
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

  const endpoint = useMemo(() => buildEndpoint(countryCode, slug, cursor, pageSize), [countryCode, slug, cursor, pageSize])

  const fetchMore = () => {
    if (!moreAvailable || isPending) {
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const json = (await response.json()) as LoadMoreResponse
        setPosts((previous) => [...previous, ...json.posts])
        setCursor(json.pageInfo.endCursor)
        setMoreAvailable(json.pageInfo.hasNextPage)
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
