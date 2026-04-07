"use client"

import { useCallback } from "react"
import { CommentList } from "@/components/CommentList"
import { CommentForm } from "@/components/CommentForm"

interface ArticleCommentsProps {
  postId: string
  countryCode: string
}

export function ArticleComments({ postId, countryCode }: ArticleCommentsProps) {
  const handleCommentAdded = useCallback(() => {
    // CommentList handles refresh via real-time sync;
    // no explicit action needed here.
  }, [])

  return (
    <section id="comments-section" aria-label="Comments" className="mt-8 space-y-6">
      <CommentForm
        postId={postId}
        editionCode={countryCode}
        onCommentAdded={handleCommentAdded}
        placeholder="Share your thoughts on this article..."
      />

      <CommentList postId={postId} editionCode={countryCode} />
    </section>
  )
}
