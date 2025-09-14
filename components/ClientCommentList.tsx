"use client"
import logger from "@/utils/logger"

import { useState } from "react"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Trash2, Reply, ThumbsUp } from "lucide-react"
import { deleteComment } from "@/lib/wordpress-api"
import { Skeleton } from "@/components/ui/skeleton"

interface Comment {
  id: number
  author_name: string
  content: { rendered: string }
  date: string
  status: string
}

interface ClientCommentListProps {
  postId: number
  initialComments: Comment[]
}

export function ClientCommentList({ postId, initialComments }: ClientCommentListProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [showReplyForm, setShowReplyForm] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const { user } = useUser()

  const handleDeleteComment = async (commentId: number) => {
    try {
      setIsDeleting(commentId)
      await deleteComment(commentId)
      setComments(comments.filter((comment) => comment.id !== commentId))
      setIsDeleting(null)
    } catch (error) {
      logger.error("Failed to delete comment:", error)
      setError("Failed to delete comment. Please try again.")
      setIsDeleting(null)
    }
  }

  const handleReply = (commentId: number) => {
    setShowReplyForm(showReplyForm === commentId ? null : commentId)
    setReplyText("")
  }

  const submitReply = async (parentId: number) => {
    // Implementation for submitting reply would go here
    // This is a placeholder
    logger.log(`Replying to comment ${parentId}: ${replyText}`)
    setShowReplyForm(null)
    setReplyText("")
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error loading comments: {error}
        <Button variant="outline" size="sm" className="ml-4" onClick={() => setError(null)}>
          Dismiss
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Comments ({comments.length})</h3>

      {comments.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <p className="text-gray-600">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
                  {comment.author_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{comment.author_name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(comment.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                {user && user.username === comment.author_name && (
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
                  <Reply className="h-4 w-4 mr-1" />
                  Reply
                </Button>

                <Button variant="ghost" size="sm" aria-label="Like comment">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Like
                </Button>
              </div>
            </div>

            <div
              dangerouslySetInnerHTML={{ __html: comment.content.rendered }}
              className="mt-3 text-gray-700 prose prose-sm max-w-none"
            />

            {showReplyForm === comment.id && (
              <div className="mt-4 pl-4 border-l-2 border-gray-200">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write your reply..."
                  rows={3}
                />
                <div className="flex justify-end space-x-2 mt-2">
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
        ))
      )}
    </div>
  )
}
