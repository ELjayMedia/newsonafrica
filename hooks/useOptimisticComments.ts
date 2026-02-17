"use client"

import { useCallback, useMemo, useState } from "react"

import type { Comment } from "@/lib/supabase-schema"

export function useOptimisticComments(baseComments: Comment[]) {
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([])
  const [failedComments, setFailedComments] = useState<string[]>([])

  const renderedComments = useMemo(() => [...optimisticComments, ...baseComments], [baseComments, optimisticComments])
  const failedCommentSet = useMemo(() => new Set(failedComments), [failedComments])

  const addOptimisticComment = useCallback((comment: Comment) => {
    setOptimisticComments((previous) => [comment, ...previous])
  }, [])

  const clearOptimisticComments = useCallback(() => {
    setOptimisticComments([])
  }, [])

  const rollbackOptimisticComment = useCallback((commentId: string, delayMs = 5000) => {
    setFailedComments((previous) => [...previous, commentId])

    const timeoutId = setTimeout(() => {
      setOptimisticComments((previous) => previous.filter((comment) => comment.id !== commentId))
      setFailedComments((previous) => previous.filter((id) => id !== commentId))
    }, delayMs)

    return () => clearTimeout(timeoutId)
  }, [])

  return {
    optimisticComments,
    renderedComments,
    failedCommentSet,
    addOptimisticComment,
    clearOptimisticComments,
    rollbackOptimisticComment,
  }
}
