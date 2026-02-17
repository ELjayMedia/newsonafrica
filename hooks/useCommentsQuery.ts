"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"

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

interface LoadCommentsOptions {
  append?: boolean
  cursorOverride?: string | null
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const mergeAppendComments = (current: Comment[][], incoming: Comment[]) => {
  if (incoming.length === 0) {
    return current
  }

  const nextPages = current.map((page) => [...page])
  const existingIds = new Set(nextPages.flat().map((comment) => comment.id))
  const updatesById = new Map(incoming.map((comment) => [comment.id, comment]))

  for (let pageIndex = 0; pageIndex < nextPages.length; pageIndex++) {
    nextPages[pageIndex] = nextPages[pageIndex].map((comment) => updatesById.get(comment.id) ?? comment)
  }

  const appendedNew = incoming.filter((comment) => !existingIds.has(comment.id))
  if (appendedNew.length > 0) {
    nextPages.push(appendedNew)
  }

  return nextPages
}

const hasComment = (pages: Comment[][], commentId: string) => pages.some((page) => page.some((comment) => comment.id === commentId))

const patchCommentInPages = (pages: Comment[][], incoming: Comment) => {
  let found = false
  const nextPages = pages.map((page) =>
    page.map((comment) => {
      if (comment.id !== incoming.id) {
        return comment
      }

      found = true
      return incoming
    }),
  )

  if (!found) {
    return [[incoming], ...nextPages]
  }

  return nextPages
}

const removeCommentFromPages = (pages: Comment[][], commentId: string) =>
  pages
    .map((page) => page.filter((comment) => comment.id !== commentId))
    .filter((page) => page.length > 0)

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
  const [pages, setPages] = useState<Comment[][]>(initialComments.length > 0 ? [initialComments] : [])
  const [pagination, setPagination] = useState<PaginationState>({ cursor: initialCursor, hasMore: initialHasMore })
  const [loading, setLoading] = useState(initialComments.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [totalComments, setTotalComments] = useState(
    typeof initialTotal === "number" ? initialTotal : initialComments.length,
  )
  const [isPending, startTransition] = useTransition()

  const paginationRef = useRef(pagination)
  const hasHydratedInitial = useRef(initialComments.length > 0)
  const skipInitialFetchRef = useRef(initialComments.length > 0)

  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  const comments = useMemo(() => pages.flat(), [pages])

  const loadComments = useCallback(
    async ({ append = false, cursorOverride }: LoadCommentsOptions = {}) => {
      setLoading(true)

      try {
        const currentPagination = paginationRef.current
        const cursorValue = cursorOverride ?? (append ? currentPagination.cursor : null)

        let attempt = 0
        let lastError: unknown = null

        while (attempt < maxRetries) {
          try {
            const response = await fetchCommentsPageAction({
              postId,
              editionCode,
              page: append ? 1 : 0,
              pageSize,
              sortOption,
              cursor: cursorValue ?? null,
            })

            startTransition(() => {
              setPages((currentPages) =>
                append ? mergeAppendComments(currentPages, response.comments) : (response.comments.length > 0 ? [response.comments] : []),
              )
              setPagination({
                cursor: response.nextCursor ?? null,
                hasMore: response.hasMore,
              })

              if (typeof response.total === "number") {
                setTotalComments(response.total)
              } else if (!append && response.comments.length === 0) {
                setTotalComments(0)
              }

              setError(null)
              hasHydratedInitial.current = true
            })

            return
          } catch (fetchError) {
            lastError = fetchError
            attempt += 1

            if (attempt >= maxRetries) {
              break
            }

            await sleep(retryDelayMs * 2 ** (attempt - 1))
          }
        }

        console.error("Error loading comments:", lastError)
        setError("Failed to load comments. Please try refreshing the page.")
      } finally {
        setLoading(false)
      }
    },
    [editionCode, maxRetries, pageSize, postId, retryDelayMs, sleep, sortOption, startTransition],
  )

  const loadCommentsRef = useRef(loadComments)

  useEffect(() => {
    loadCommentsRef.current = loadComments
  }, [loadComments])

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false
      return
    }

    hasHydratedInitial.current = false
    void loadCommentsRef.current({ append: false })
  }, [postId, sortOption])

  const loadMoreComments = useCallback(() => {
    if (!paginationRef.current.hasMore || loading || isPending) {
      return
    }

    void loadComments({ append: true })
  }, [isPending, loading, loadComments])

  const refreshComments = useCallback(() => {
    setError(null)
    void loadComments({ append: false })
  }, [loadComments])

  const upsertComment = useCallback((comment: Comment) => {
    setPages((currentPages) => {
      const exists = hasComment(currentPages, comment.id)
      const nextPages = patchCommentInPages(currentPages, comment)
      if (!exists) {
        setTotalComments((total) => total + 1)
      }
      return nextPages
    })
  }, [])

  const removeComment = useCallback((commentId: string) => {
    setPages((currentPages) => {
      const exists = hasComment(currentPages, commentId)
      const nextPages = removeCommentFromPages(currentPages, commentId)
      if (exists) {
        setTotalComments((total) => Math.max(0, total - 1))
      }
      return nextPages
    })
  }, [])

  return {
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
    setError,
    upsertComment,
    removeComment,
  }
}
