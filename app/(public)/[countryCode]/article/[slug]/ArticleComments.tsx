"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Comment } from "@/lib/supabase-schema"

type CommentsResponse = {
  success?: boolean
  data?: {
    comments?: Comment[]
    hasMore?: boolean
    totalCount?: number
    nextCursor?: string | null
  }
}

type UiComment = {
  id: string
  authorName: string
  content: string
  createdAt: string | null
}

interface ArticleCommentsProps {
  postId: number
  countryCode: string
}

const fetcher = async (url: string): Promise<CommentsResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch comments")
  return res.json() as Promise<CommentsResponse>
}

export function ArticleComments({ postId, countryCode }: ArticleCommentsProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allComments, setAllComments] = useState<Comment[]>([])

  const { data, error, isLoading } = useSWR(
    `/api/comments?postId=${postId}&countryCode=${countryCode}&cursor=${cursor || ""}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  )

  const responseData = data?.data
  const fetchedComments = responseData?.comments ?? []

  useEffect(() => {
    if (fetchedComments.length === 0) {
      return
    }

    setAllComments((previousComments) => {
      const previousIds = new Set(previousComments.map((comment) => comment.id))
      const uniqueNewComments = fetchedComments.filter((comment) => !previousIds.has(comment.id))

      if (uniqueNewComments.length === 0) {
        return previousComments
      }

      return [...previousComments, ...uniqueNewComments]
    })
  }, [fetchedComments])

  const uiComments = useMemo<UiComment[]>(
    () =>
      allComments.map((comment) => ({
        id: comment.id,
        authorName: comment.profile?.username ?? "Anonymous",
        content: comment.body,
        createdAt: comment.created_at ?? null,
      })),
    [allComments],
  )

  const handleLoadMore = () => {
    if (responseData?.nextCursor) {
      setCursor(responseData.nextCursor)
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
      <h3 className="text-lg font-semibold">Comments ({responseData?.totalCount || 0})</h3>

      {isLoading && uiComments.length === 0 ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 bg-gray-200" />
          ))}
        </div>
      ) : uiComments.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-gray-600">No comments yet. Be the first to comment!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {uiComments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{comment.authorName}</span>
                <span className="text-xs text-gray-500">
                  {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
              <p className="text-sm mt-2">{comment.content}</p>
            </Card>
          ))}
        </div>
      )}

      {responseData?.hasMore && (
        <Button onClick={handleLoadMore} variant="outline" className="w-full bg-transparent">
          Load More Comments
        </Button>
      )}
    </div>
  )
}
