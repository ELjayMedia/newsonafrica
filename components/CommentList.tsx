"use client"

import { useState, useRef, useCallback } from "react"
import { CommentForm } from "@/components/CommentForm"
import { CommentItem } from "@/components/CommentItem"
import type { Comment, CommentSortOption } from "@/lib/supabase-schema"
import { MessageSquare, AlertCircle, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useInView } from "react-intersection-observer"
import { MIGRATION_INSTRUCTIONS } from "@/lib/supabase-migrations"
import { useUser } from "@/contexts/UserContext"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useComments } from "@/hooks/useComments"

interface CommentListProps {
  postId: string
}

export function CommentList({ postId }: CommentListProps) {
  const [sortOption, setSortOption] = useState<CommentSortOption>("newest")
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([])
  const [showMigrationInfo, setShowMigrationInfo] = useState(false)
  const { user } = useUser()

  // Use our optimized comments hook
  const { comments, loading, error, hasMore, totalComments, loadMore, refresh } = useComments({
    postId,
    pageSize: 10,
    sortOption,
  })

  // For infinite scroll
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  })

  // For rate limiting
  const lastCommentTime = useRef<number | null>(null)
  const RATE_LIMIT_MS = 10000 // 10 seconds

  // For optimistic updates
  const [failedComments, setFailedComments] = useState<string[]>([])

  // Handle optimistic updates
  const handleCommentAdded = useCallback(
    (optimisticComment?: Comment) => {
      if (optimisticComment?.isOptimistic) {
        // Add optimistic comment to the UI
        setOptimisticComments((prev) => [optimisticComment, ...prev])
      } else {
        // Real comment was added, refresh the list and clear optimistic comments
        refresh()
        setOptimisticComments([])
      }
    },
    [refresh],
  )

  // Handle comment failure
  const handleCommentFailed = useCallback((commentId: string) => {
    setFailedComments((prev) => [...prev, commentId])

    // Remove from optimistic comments after a delay
    setTimeout(() => {
      setOptimisticComments((prev) => prev.filter((comment) => comment.id !== commentId))
      setFailedComments((prev) => prev.filter((id) => id !== commentId))
    }, 5000) // Show error state for 5 seconds
  }, [])

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
  const handleSortChange = (option: CommentSortOption) => {
    setSortOption(option)
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

  // Effect to load more comments when scrolling to the bottom
  if (inView && hasMore && !loading) {
    loadMore()
  }

  // Combine real and optimistic comments for display
  const displayComments = [...optimisticComments, ...comments]

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center">
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
        onCommentAdded={handleCommentAdded}
        onCommentFailed={handleCommentFailed}
        isRateLimited={isRateLimited}
        rateLimitTimeRemaining={getRateLimitTimeRemaining}
      />

      {showMigrationInfo && (
        <Alert variant="warning" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Database Migration Required</p>
            <p className="text-sm mt-1">
              The enhanced comment system requires a database update. Please provide the following SQL to your database
              administrator:
            </p>
            <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-40">{MIGRATION_INSTRUCTIONS}</pre>
          </AlertDescription>
        </Alert>
      )}

      {loading && comments.length === 0 ? (
        <div className="space-y-4 mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex space-x-4">
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
        <div className="p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
      ) : displayComments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <>
          <div className="space-y-6 mt-6">
            {displayComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onCommentUpdated={refresh}
                onReplyAdded={handleCommentAdded}
                onReplyFailed={handleCommentFailed}
                isRateLimited={isRateLimited}
                rateLimitTimeRemaining={getRateLimitTimeRemaining}
                isFailed={failedComments.includes(comment.id)}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={ref} className="flex justify-center py-4" aria-live="polite">
              {loading ? (
                <p className="text-gray-500">Loading more comments...</p>
              ) : (
                <Button variant="outline" onClick={loadMore}>
                  Load More Comments
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
