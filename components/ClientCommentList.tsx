"use client"

import { useState } from "react"
import { Trash2, Reply, ThumbsUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/contexts/UserContext"
import { deleteComment } from "@/lib/comment-service"
import type { Comment } from "@/lib/supabase-schema"

interface ClientCommentListProps {
  postId: string
  initialComments: Comment[]
}

export function ClientCommentList({ postId, initialComments }: ClientCommentListProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const { user } = useUser()

  const handleDeleteComment = async (commentId: string) => {
    try {
      setIsDeleting(commentId)
      await deleteComment(commentId)
      setComments((current) => current.filter((comment) => comment.id !== commentId))
      setIsDeleting(null)
    } catch (err) {
      console.error("Failed to delete comment:", err)
      const message = err instanceof Error ? err.message : "Failed to delete comment. Please try again."
      setError(message)
      setIsDeleting(null)
    }
  }

  const handleReply = (commentId: string) => {
    setShowReplyForm(showReplyForm === commentId ? null : commentId)
    setReplyText("")
  }

  const submitReply = async (parentId: string) => {
    console.log(`Replying to comment ${parentId} on post ${postId}: ${replyText}`)
    setShowReplyForm(null)
    setReplyText("")
  }

  const renderContent = (comment: Comment) => {
    if (comment.is_rich_text) {
      return (
        <div
          className="mt-3 max-w-none text-gray-700 prose prose-sm"
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />
      )
    }

    return <div className="mt-3 whitespace-pre-wrap text-gray-700">{comment.content}</div>
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-600">
        Error loading comments: {error}
        <Button variant="outline" size="sm" className="ml-4" onClick={() => setError(null)}>
          Dismiss
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="mb-4 text-xl font-semibold">Comments ({comments.length})</h3>

      {comments.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        comments.map((comment) => {
          const displayName = comment.profile?.username || "Anonymous"
          const createdAt = new Date(comment.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          const canDelete = user?.id === comment.user_id

          return (
            <div key={comment.id} className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{displayName}</p>
                    <p className="text-sm text-gray-500">{createdAt}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={isDeleting === comment.id}
                      aria-label="Delete comment"
                    >
                      {isDeleting === comment.id ? (
                        <Skeleton className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  )}

                  <Button variant="ghost" size="sm" onClick={() => handleReply(comment.id)} aria-label="Reply to comment">
                    <Reply className="mr-1 h-4 w-4" />
                    Reply
                  </Button>

                  <Button variant="ghost" size="sm" aria-label="Like comment">
                    <ThumbsUp className="mr-1 h-4 w-4" />
                    Like
                  </Button>
                </div>
              </div>

              {renderContent(comment)}

              {showReplyForm === comment.id && (
                <div className="mt-4 border-l-2 border-gray-200 pl-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write your reply..."
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setShowReplyForm(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => submitReply(comment.id)} disabled={!replyText.trim()}>
                      Submit Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
