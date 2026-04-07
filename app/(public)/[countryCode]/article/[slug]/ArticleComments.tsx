"use client"

import dynamic from "next/dynamic"

const CommentList = dynamic(() => import("@/components/CommentList").then((m) => ({ default: m.CommentList })), {
  ssr: false,
})

const CommentForm = dynamic(() => import("@/components/CommentForm").then((m) => ({ default: m.CommentForm })), {
  ssr: false,
})

interface ArticleCommentsProps {
  postId: string
  countryCode: string
}

export function ArticleComments({ postId, countryCode }: ArticleCommentsProps) {
  return (
    <section id="comments-section" aria-label="Comments" className="mt-8 space-y-6">
      <CommentForm
        postId={postId}
        editionCode={countryCode}
        onCommentAdded={() => {}}
        placeholder="Share your thoughts on this article..."
      />

      <CommentList postId={postId} editionCode={countryCode} />
    </section>
  )
}
