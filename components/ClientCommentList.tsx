"use client"

import { useState } from "react"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { deleteComment } from "@/lib/wordpress-api"

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
  const { user } = useUser()

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(commentId)
      setComments(comments.filter((comment) => comment.id !== commentId))
    } catch (error) {
      console.error("Failed to delete comment:", error)
      setError("Failed to delete comment. Please try again.")
    }
  }

  if (error) {
    return <div className="text-red-500">Error loading comments: {error}</div>
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p>No comments yet. Be the first to comment!</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{comment.author_name}</p>
                <p className="text-sm text-gray-500">{new Date(comment.date).toLocaleDateString()}</p>
              </div>
              {user && user.username === comment.author_name && (
                <Button variant="ghost" size="sm" onClick={() => handleDeleteComment(comment.id)}>
                  Delete
                </Button>
              )}
            </div>
            <div dangerouslySetInnerHTML={{ __html: comment.content.rendered }} className="mt-2" />
          </div>
        ))
      )}
    </div>
  )
}
