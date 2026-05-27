"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { fetchCommentsPageAction } from "@/app/(public)/[countryCode]/article/[slug]/actions"
import type { Comment, CommentSortOption } from "@/lib/supabase-schema"

type PaginationState = {
  cursor: string | null
  hasMore: boolean
}

interface UseCommentsQueryOptions {
  postId: string
  editionCode: string
  sortOption: CommentSortOption
  initialComments?: Comment[]
  initialCursor?: string | null
  initialHasMore?: boolean
  initialTotal?: number
  pageSize?: number
  maxRetries?: number
  retryDelayMs?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const mergeComments = (current: Comment[], incoming: Comment[]) => {
  if (incoming.length === 0) return current

  const existingIds = new Set(current.map((comment) => comment.id))
  const updatesById = new Map(incoming.map((comment) => [comment.id, comment]))
  const updatedCurrent = current.map((comment) => updatesById.get(comment.id) ?? comment)
  const newComments = incoming.filter((comment) => !existingIds.has(comment.id))

  return [...updatedCurrent, ...newComments]
}

const replaceOrPrependComment = (comments: Comment[], incoming: Comment) => {
  const existingIndex = comments.findIndex((comment) => comment.id === incoming.id)
  if (existingIndex === -1) return [incoming, ...comments]

  const next = [...comments]
  next[existingIndex] = incoming
  return next
}

export function useCommentsQuery({
  postId,
  editionCode,
  sortOption,
  initialComments = [],
  initialCursor = null,
  initialHasMore = false,
  initialTotal,
  pageSize = 10,
  maxRetries = 3,
  retryDelayMs = 300,
  sleep = defaultSleep,
}: UseCommentsQueryOptions) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [pagination, setPagination] = useState<PaginationState>({ cursor: initialCursor, hasMore: initialHasMore })
  const [loading, setLoading] = useState(initialComments.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [totalComments, setTotalComments] = useState(
    typeof initialTotal === "number" ? initialTotal : initialComments.length,
  )

  const paginationRef = useRef(pagination)
  const hasHydratedInitial = useRef(initialComments.length > 0)
  const skipInitialFetchRef = useRef(initialComments.length > 0)

  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  const fetchComments = useCallback(
    async (append = false) => {
      if (append && !paginationRef.current.hasMore) return

      setLoading(true)

      const cursor = append ? paginationRef.current.cursor : null
      let lastError: unknown = null

      for (let attempt = 0; attempt < maxRetries; attempt += 1) {
        try {
          const response = await fetchCommentsPageAction({
            postId,
            editionCode,
            page: append ? 1 : 0,
            pageSize,
            sortOption,
            cursor,
          })

          setComments((current) => (append ? mergeComments(current, response.comments) : response.comments))
          setPagination({ cursor: response.nextCursor ?? null, hasMore: response.hasMore })

          if (typeof response.total === "number") {
            setTotalComments(response.total)
          } else if (!append) {
            setTotalComments(response.comments.length)
          }

          setError(null)
          hasHydratedInitial.current = true
          setLoading(false)
          return
        } catch (fetchError) {
          lastError = fetchError
          if (attempt < maxRetries - 1) {
            await sleep(retryDelayMs * 2 ** attempt)
          }
        }
      }

      console.error("Error loading comments:", lastError)
      setError("Failed to load comments. Please try refreshing the page.")
      setLoading(false)
    },
    [editionCode, maxRetries, pageSize, postId, retryDelayMs, sleep, sortOption],
  )

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false
      return
    }

    hasHydratedInitial.current = false
    void fetchComments(false)
  }, [fetchComments])

  const loadMoreComments = useCallback(() => {
    void fetchComments(true)
  }, [fetchComments])

  const refreshComments = useCallback(() => {
    setError(null)
    void fetchComments(false)
  }, [fetchComments])

  const upsertComment = useCallback((comment: Comment) => {
    setComments((currentComments) => {
      const exists = currentComments.some((current) => current.id === comment.id)
      if (!exists) {
        setTotalComments((total) => total + 1)
      }
      return replaceOrPrependComment(currentComments, comment)
    })
  }, [])

  const removeComment = useCallback((commentId: string) => {
    setComments((currentComments) => {
      const exists = currentComments.some((comment) => comment.id === commentId)
      if (exists) {
        setTotalComments((total) => Math.max(0, total - 1))
      }
      return currentComments.filter((comment) => comment.id !== commentId)
    })
  }, [])

  return useMemo(
    () => ({
      comments,
      loading,
      isPending: false,
      error,
      totalComments,
      pagination,
      hasHydratedInitial,
      loadMoreComments,
      refreshComments,
      setError,
      upsertComment,
      removeComment,
    }),
    [comments, error, loadMoreComments, loading, pagination, refreshComments, removeComment, totalComments, upsertComment],
  )
}
