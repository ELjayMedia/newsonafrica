"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import { CommentItem } from "@/components/CommentItem"
import type { Comment, CommentSortOption } from "@/lib/supabase-schema"
import { MessageSquare, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCommentsQuery } from "@/hooks/useCommentsQuery"
import { useOptimisticComments } from "@/hooks/useOptimisticComments"
import { useCommentsRealtimeSync } from "@/hooks/useCommentsRealtimeSync"

interface CommentListProps {
  postId: string
  editionCode: string
  initialComments?: Comment[]
  initialCursor?: string | null
  initialHasMore?: boolean
  initialTotal?: number
}

export function CommentList({
  postId,
  editionCode,
  initialComments = [],
  initialCursor = null,
  initialHasMore = false,
  initialTotal,
}: CommentListProps) {
  const paginationRef = useRef({ cursor: initialCursor, hasMore: initialHasMore })
  const { preferences, setCommentSortPreference } = useUserPreferences()
  const [sortOption, setSortOption] = useState<CommentSortOption>(preferences.commentSort)
  const {
    comments,
    loading,
    isPending,
    error,
    totalComments,
    pagination,
    hasHydratedInitial,
    loadComments,
    loadMoreComments,
    refreshComments,
    upsertComment,
    removeComment,
  } = useCommentsQuery({
    postId,
    editionCode,
    sortOption,
    initialComments,
    initialCursor,
    initialHasMore,
    initialTotal,
  })
  const { renderedComments, failedCommentSet, addOptimisticComment, rollbackOptimisticComment } =
    useOptimisticComments(comments)

  const isFetching = loading || isPending
  const isInitialLoad = isFetching && !hasHydratedInitial.current
  const isLoadingMore = isFetching && !isInitialLoad

  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  const totalRenderableComments = renderedComments.length

  const getCommentAtIndex = useCallback((index: number): Comment | undefined => renderedComments[index], [renderedComments])

  const sortOptions: { value: CommentSortOption; label: string }[] = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "popular", label: "Most liked" },
  ]

  useCommentsRealtimeSync({
    postId,
    upsertComment,
    removeComment,
    onRefreshNeeded: refreshComments,
  })

  const handleSortChange = async (newSort: CommentSortOption) => {
    if (newSort === sortOption) return

    setSortOption(newSort)
    await setCommentSortPreference(newSort)
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">Unable to load comments</p>
        <p className="mt-1 text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={refreshComments} className="mt-3">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <section className="mt-8" aria-labelledby="comments-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="comments-heading" className="flex items-center gap-2 text-xl font-semibold">
          <MessageSquare className="h-5 w-5" />
          Comments ({totalComments})
        </h2>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={sortOption === option.value ? "font-semibold" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isInitialLoad ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border p-4">
              <div className="mb-2 h-4 w-1/4 rounded bg-gray-200" />
              <div className="mb-2 h-3 w-full rounded bg-gray-200" />
              <div className="h-3 w-3/4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : totalRenderableComments === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p>No comments yet. Be the first to share your thoughts.</p>
        </div>
      ) : (
        <Virtuoso
          useWindowScroll
          data={renderedComments}
          endReached={() => {
            if (paginationRef.current.hasMore && !isLoadingMore) {
              loadMoreComments()
            }
          }}
          itemContent={(index) => {
            const comment = getCommentAtIndex(index)
            if (!comment) return null

            return (
              <CommentItem
                key={comment.id}
                comment={comment}
                isFailed={failedCommentSet.has(comment.id)}
                onRetry={() => addOptimisticComment(comment)}
                onRemove={() => rollbackOptimisticComment(comment.id)}
              />
            )
          }}
        />
      )}

      {isLoadingMore && <p className="mt-4 text-center text-sm text-gray-500">Loading more comments…</p>}
    </section>
  )
}
