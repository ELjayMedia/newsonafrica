"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import { CommentForm } from "@/components/CommentForm"
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
  const { renderedComments, failedCommentSet, addOptimisticComment, clearOptimisticComments, rollbackOptimisticComment } =
    useOptimisticComments(comments)

  const isFetching = loading || isPending
  const isInitialLoad = isFetching && !hasHydratedInitial.current
  const isLoadingMore = isFetching && !isInitialLoad

  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  const totalRenderableComments = renderedComments.length

  const getCommentAtIndex = useCallback((index: number): Comment | undefined => renderedComments[index], [renderedComments])

  // For rate limiting
  const lastCommentTime = useRef<number | null>(null)
  const RATE_LIMIT_MS = 10000 // 10 seconds

  useCommentsRealtimeSync({
    postId,
    upsertComment,
    removeComment,
  })

  // Handle optimistic updates
  const handleCommentAdded = useCallback(
    (optimisticComment?: Comment) => {
      if (optimisticComment?.isOptimistic) {
        addOptimisticComment(optimisticComment)
      } else {
        void loadComments({ append: false })
        clearOptimisticComments()
      }
    },
    [addOptimisticComment, clearOptimisticComments, loadComments],
  )

  // Handle comment failure
  const handleCommentFailed = useCallback((commentId: string) => {
    rollbackOptimisticComment(commentId)
  }, [rollbackOptimisticComment])

  // Check if user is rate limited
  const isRateLimited = useCallback(() => {
    if (!lastCommentTime.current) return false

    const timeSinceLastComment = Date.now() - lastCommentTime.current
    return timeSinceLastComment < RATE_LIMIT_MS
  }, [])

  // Calculate time remaining for rate limit
  const getRateLimitTimeRemaining = useCallback(() => {
    if (!lastCommentTime.current) return 0

    const timeSinceLastComment = Date.now() - lastCommentTime.current
    return Math.max(0, Math.ceil((RATE_LIMIT_MS - timeSinceLastComment) / 1000))
  }, [])

  // Handle sort change
  useEffect(() => {
    setSortOption(preferences.commentSort)
  }, [preferences.commentSort])

  const handleSortChange = (option: CommentSortOption) => {
    setSortOption(option)
    void setCommentSortPreference(option)
  }

  // Get sort option display text
  const getSortOptionText = (option: CommentSortOption) => {
    switch (option) {
      case "newest":
        return "Newest First"
      case "oldest":
        return "Oldest First"
      case "popular":
        return "Most Popular"
      default:
        return "Sort"
    }
  }

  // Handle retry
  const handleRetry = () => {
    refreshComments()
  }

  return (
    <div id="comments" className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Comments {totalComments > 0 && `(${totalComments})`}
        </h3>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {getSortOptionText(sortOption)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSortChange("newest")}>Newest First</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("oldest")}>Oldest First</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("popular")}>Most Popular</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommentForm
        postId={postId}
        editionCode={editionCode}
        onCommentAdded={handleCommentAdded}
        isRateLimited={isRateLimited}
        rateLimitTimeRemaining={getRateLimitTimeRemaining}
      />

      {isInitialLoad ? (
        <div className="space-y-3 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      ) : totalRenderableComments === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="mt-4">
          <Virtuoso
            totalCount={totalRenderableComments}
            itemContent={(index) => {
              const comment = getCommentAtIndex(index)

              if (!comment) {
                return (
                  <div className="py-4">
                    <p className="text-sm text-gray-500">Unable to load this comment.</p>
                  </div>
                )
              }

              return (
              <CommentItem
                  comment={comment}
                  postId={postId}
                  editionCode={editionCode}
                  onCommentUpdated={refreshComments}
                  onReplyAdded={handleCommentAdded}
                  onReplyFailed={handleCommentFailed}
                  isRateLimited={isRateLimited}
                  rateLimitTimeRemaining={getRateLimitTimeRemaining}
                  isFailed={failedCommentSet.has(comment.id)}
                />
              )
            }}
            computeItemKey={(index) => {
              const comment = getCommentAtIndex(index)
              return comment ? comment.id : `missing-${index}`
            }}
            endReached={loadMoreComments}
            useWindowScroll
            components={{
              Footer: () =>
                paginationRef.current.hasMore ? (
                  <div className="flex justify-center py-4" aria-live="polite">
                    {isLoadingMore ? (
                      <p className="text-gray-500">Loading more comments...</p>
                    ) : (
                      <Button variant="outline" size="sm" onClick={loadMoreComments} disabled={isFetching}>
                        Load More Comments
                      </Button>
                    )}
                  </div>
                ) : null,
            }}
          />
        </div>
      )}
    </div>
  )
}
