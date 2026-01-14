"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Comment } from "@/lib/supabase-schema"

interface ArticleCommentsProps {
  postId: number
  countryCode: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch comments")
  return res.json()
}

export function ArticleComments({ postId, countryCode }: ArticleCommentsProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allComments, setAllComments] = useState<Comment[]>([])

  const { data, error, isLoading } = useSWR(
    `/api/comments?postId=${postId}&countryCode=${countryCode}&cursor=${cursor || ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  )

  // Append new comments to existing list for pagination
  if (data && data.comments) {
    const newComments = data.comments.filter((comment: Comment) => !allComments.some((c) => c.id === comment.id))
    if (newComments.length > 0) {
      setAllComments([...allComments, ...newComments])
    }
  }

  const handleLoadMore = () => {
    if (data?.cursor) {
      setCursor(data.cursor)
    }
  }

  if (error)
    return (
      <Card className="p-4">
        <p className="text-sm text-red-600">Failed to load comments. Please refresh.</p>
      </Card>
    )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments ({data?.total || 0})</h3>

      {isLoading && allComments.length === 0 ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 bg-gray-200" />
          ))}
        </div>
      ) : allComments.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-gray-600">No comments yet. Be the first to comment!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {allComments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{comment.author_name}</span>
                <span className="text-xs text-gray-500">
                  {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ""}
                </span>
              </div>
              <p className="text-sm mt-2">{comment.content}</p>
            </Card>
          ))}
        </div>
      )}

      {data?.has_more && (
        <Button onClick={handleLoadMore} variant="outline" className="w-full bg-transparent">
          Load More Comments
        </Button>
      )}
    </div>
  )
}
