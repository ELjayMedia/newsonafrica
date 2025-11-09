"use client"

import { useEffect, useState, useRef, useCallback, useMemo, useTransition } from "react"
import { Virtuoso } from "react-virtuoso"
import { supabase } from "@/lib/supabase"
import { CommentForm } from "@/components/CommentForm"
import { CommentItem } from "@/components/CommentItem"
import type { Comment, CommentSortOption } from "@/lib/supabase-schema"
import { MessageSquare, AlertCircle, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MIGRATION_INSTRUCTIONS } from "@/lib/supabase-migrations"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { fetchCommentsPageAction } from "@/app/[countryCode]/article/[slug]/actions"

interface CommentListProps {
  postId: string
  initialComments?: Comment[]
  initialCursor?: string | null
  initialHasMore?: boolean
  initialTotal?: number
}

export function CommentList({
  postId,
  initialComments = [],
  initialCursor = null,
  initialHasMore = false,
  initialTotal,
}: CommentListProps) {
  const commentCacheRef = useRef<Map<string, Comment>>(new Map())
  const commentOrderRef = useRef<string[]>([])
  const paginationRef = useRef({ page: 0, cursor: initialCursor, hasMore: initialHasMore })
  const [pagination, setPagination] = useState({ page: 0, cursor: initialCursor, hasMore: initialHasMore })
  const [commentsVersion, setCommentsVersion] = useState(() => {
    if (initialComments.length > 0) {
      const cache = commentCacheRef.current
      const order: string[] = []
      initialComments.forEach((comment) => {
        cache.set(comment.id, comment)
        order.push(comment.id)
      })
      commentOrderRef.current = order
      return 1
    }

    return 0
  })
  const [loading, setLoading] = useState(initialComments.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [totalComments, setTotalComments] = useState(
    typeof initialTotal === "number" ? initialTotal : initialComments.length,
  )
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([])
  const [showMigrationInfo, setShowMigrationInfo] = useState(false)
  const { preferences, setCommentSortPreference } = useUserPreferences()
  const [sortOption, setSortOption] = useState<CommentSortOption>(preferences.commentSort)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const [isPending, startTransition] = useTransition()
  const isFetching = loading || isPending
  const hasHydratedInitial = useRef(initialComments.length > 0)
  const isInitialLoad = isFetching && !hasHydratedInitial.current
  const isLoadingMore = isFetching && pagination.page > 0

  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  const mergeComments = useCallback(
    (incoming: Comment[], append: boolean) => {
      const cache = commentCacheRef.current
      if (!append) {
        cache.clear()
        commentOrderRef.current = []
      }

      incoming.forEach((comment) => {
        const alreadyPresent = cache.has(comment.id)
        cache.set(comment.id, comment)

        if (!append) {
          commentOrderRef.current.push(comment.id)
        } else if (!alreadyPresent) {
          commentOrderRef.current.push(comment.id)
        }
      })

      if (!append) {
        commentOrderRef.current = incoming.map((comment) => comment.id)
      }

      setCommentsVersion((version) => version + 1)
    },
    [],
  )

  const displayComments = useMemo(() => {
    void commentsVersion
    const ordered = commentOrderRef.current
      .map((id) => commentCacheRef.current.get(id))
      .filter((comment): comment is Comment => Boolean(comment))

    return [...optimisticComments, ...ordered]
  }, [commentsVersion, optimisticComments])

  // For rate limiting
  const lastCommentTime = useRef<number | null>(null)
  const RATE_LIMIT_MS = 10000 // 10 seconds

  // For optimistic updates
  const [failedComments, setFailedComments] = useState<string[]>([])

  const loadComments = useCallback(
    async ({ append = false, cursorOverride }: { append?: boolean; cursorOverride?: string | null } = {}) => {
      try {
        setLoading(true)

        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
        }

        const currentPagination = paginationRef.current
        const nextPage = append ? currentPagination.page + 1 : 0
        const cursorValue = cursorOverride ?? (append ? currentPagination.cursor : null)

        const {
          comments: fetchedComments,
          hasMore: moreAvailable,
          nextCursor: fetchedNextCursor,
          total,
        } = await fetchCommentsPageAction({
          postId,
          page: nextPage,
          pageSize: 10,
          sortOption,
          cursor: cursorValue ?? null,
        })

        startTransition(() => {
          mergeComments(fetchedComments, append)

          setPagination({
            page: nextPage,
            cursor: fetchedNextCursor ?? null,
            hasMore: moreAvailable,
          })

          if (typeof total === "number") {
            setTotalComments(total)
          } else if (!append && fetchedComments.length === 0) {
            setTotalComments(0)
          }

          setError(null)
          setRetryCount(0)
          hasHydratedInitial.current = true
        })
      } catch (err: any) {
        console.error("Error loading comments:", err)

        if (retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1)
          console.log(`Retrying (${retryCount + 1}/${maxRetries})...`)
          return loadComments({ append, cursorOverride })
        }

        if (
          err.message &&
          (err.message.includes("status") ||
            err.message.includes("column") ||
            err.message.includes("schema") ||
            err.message.includes("execute is not a function"))
        ) {
          setShowMigrationInfo(true)
          setError("The comment system needs a database update. Please contact the administrator.")
        } else {
          setError("Failed to load comments. Please try refreshing the page.")
        }
      } finally {
        setLoading(false)
      }
    },
    [maxRetries, mergeComments, postId, retryCount, sortOption, startTransition],
  )

  const loadCommentsRef = useRef(loadComments)

  useEffect(() => {
    loadCommentsRef.current = loadComments
  }, [loadComments])

  const skipInitialFetchRef = useRef(initialComments.length > 0)

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false
      return
    }

    setRetryCount(0)
    hasHydratedInitial.current = false
    void loadCommentsRef.current({ append: false })
  }, [postId, sortOption])

  // Subscribe to realtime updates for this post's comments
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => {
          void loadCommentsRef.current({ append: false })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])

  // Handle optimistic updates
  const handleCommentAdded = useCallback(
    (optimisticComment?: Comment) => {
      if (optimisticComment?.isOptimistic) {
        // Add optimistic comment to the UI
        setOptimisticComments((prev) => [optimisticComment, ...prev])
      } else {
        // Real comment was added, refresh the list and clear optimistic comments
        setRetryCount(0) // Reset retry count
        void loadComments({ append: false })
        setOptimisticComments([])
      }
    },
    [loadComments],
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
    setRetryCount(0)
    setError(null)
    void loadComments({ append: false })
  }

  const failedCommentSet = useMemo(() => new Set(failedComments), [failedComments])

  const loadMoreComments = useCallback(() => {
    if (!paginationRef.current.hasMore || isFetching) {
      return
    }

    void loadComments({ append: true })
  }, [isFetching, loadComments])

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
      ) : displayComments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="mt-4">
          <Virtuoso
            data={displayComments}
            computeItemKey={(_, comment) => comment.id}
            itemContent={(_, comment) => (
              <CommentItem
                comment={comment}
                postId={postId}
                onCommentUpdated={() => void loadComments({ append: false })}
                onReplyAdded={handleCommentAdded}
                onReplyFailed={handleCommentFailed}
                isRateLimited={isRateLimited}
                rateLimitTimeRemaining={getRateLimitTimeRemaining}
                isFailed={failedCommentSet.has(comment.id)}
              />
            )}
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
