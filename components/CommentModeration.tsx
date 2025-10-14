"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { approveComment, deleteComment, fetchModerationComments, type ModerationStatus } from "@/lib/comment-service"
import type { Comment } from "@/lib/supabase-schema"

const STATUS_OPTIONS: ModerationStatus[] = ["pending", "flagged", "deleted"]

export function CommentModeration() {
  const [status, setStatus] = useState<ModerationStatus>("pending")
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<{ id: string; type: "approve" | "delete" } | null>(null)

  const loadComments = useCallback(
    async (nextStatus: ModerationStatus = status) => {
      setLoading(true)
      setError(null)
      try {
        const fetched = await fetchModerationComments({ status: nextStatus, limit: 200 })
        setComments(fetched)
      } catch (err) {
        console.error("Failed to load moderation comments:", err)
        const message = err instanceof Error ? err.message : "Failed to load comments"
        setError(message)
        setComments([])
      } finally {
        setLoading(false)
      }
    },
    [status],
  )

  useEffect(() => {
    void loadComments(status)
  }, [loadComments, status])

  const handleApprove = async (commentId: string) => {
    setActiveAction({ id: commentId, type: "approve" })
    try {
      await approveComment(commentId)
      setComments((current) => current.filter((comment) => comment.id !== commentId))
    } catch (err) {
      console.error("Failed to approve comment:", err)
      const message = err instanceof Error ? err.message : "Failed to approve comment"
      setError(message)
    } finally {
      setActiveAction(null)
    }
  }

  const handleDelete = async (commentId: string) => {
    setActiveAction({ id: commentId, type: "delete" })
    try {
      await deleteComment(commentId)
      setComments((current) => current.filter((comment) => comment.id !== commentId))
    } catch (err) {
      console.error("Failed to delete comment:", err)
      const message = err instanceof Error ? err.message : "Failed to delete comment"
      setError(message)
    } finally {
      setActiveAction(null)
    }
  }

  const renderContent = (comment: Comment) => {
    if (comment.is_rich_text) {
      return (
        <div
          className="mt-2 prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />
      )
    }

    return <p className="mt-2 whitespace-pre-wrap text-gray-700">{comment.content}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Comment Moderation</h2>
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={option === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus(option)}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Button>
          ))}
          <Button variant="secondary" size="sm" disabled={loading} onClick={() => loadComments(status)}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
          <Button variant="link" size="sm" className="ml-2 px-0" onClick={() => loadComments(status)}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <p>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p>No {status} comments.</p>
      ) : (
        comments.map((comment) => {
          const displayName = comment.profile?.username || "Anonymous"
          const createdAt = new Date(comment.created_at).toLocaleString()
          const isProcessing = activeAction?.id === comment.id

          return (
            <div key={comment.id} className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-sm text-gray-500">{createdAt}</p>
                  <p className="text-xs text-gray-500">Post ID: {comment.post_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {status !== "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(comment.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing && activeAction?.type === "approve" ? "Approving..." : "Approve"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(comment.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing && activeAction?.type === "delete" ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
              {renderContent(comment)}
            </div>
          )
        })
      )}
    </div>
  )
}
