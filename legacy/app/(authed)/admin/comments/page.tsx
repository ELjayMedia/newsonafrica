// Admin Dashboard: Comments Moderation with Service Role Filtering
// ==================================================================
// CONTRACT: Admin-only view of all comments with moderation filters
// Auth: Service role (server-side only) for admin operations

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CANONICAL_COMMENT_STATUSES,
  COMMENT_STATUS_LABELS,
  type CanonicalCommentStatus,
  type ModerationFilterStatus,
} from "@/lib/comments/moderation-status"

interface AdminComment {
  id: string
  wp_post_id: number
  content: string
  created_by: string
  edition: string
  status: CanonicalCommentStatus
  created_at: string
}

const MODERATION_FILTERS: ModerationFilterStatus[] = ["all", ...CANONICAL_COMMENT_STATUSES]

export default function CommentsModeration() {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ModerationFilterStatus>("pending")

  useEffect(() => {
    fetchComments()
  }, [filter])

  async function fetchComments() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/comments?status=${filter}`)
      if (!res.ok) throw new Error("Failed to fetch comments")
      const data = await res.json()
      setComments(data)
    } catch (error) {
      console.error("[v0] Failed to fetch comments:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateCommentStatus(commentId: string, status: CanonicalCommentStatus) {
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to update comment")
      fetchComments()
    } catch (error) {
      console.error("[v0] Failed to update comment:", error)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Comments Moderation</CardTitle>
          <CardDescription>Review and moderate user comments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {MODERATION_FILTERS.map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                onClick={() => setFilter(status)}
              >
                {COMMENT_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>

          {loading ? (
            <p>Loading comments...</p>
          ) : comments.length === 0 ? (
            <p>No comments found</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">Post #{comment.wp_post_id}</p>
                      <p className="text-sm text-gray-500">By {comment.created_by}</p>
                    </div>
                    <Badge>{COMMENT_STATUS_LABELS[comment.status]}</Badge>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => updateCommentStatus(comment.id, "active")}>
                      Mark Active
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateCommentStatus(comment.id, "flagged")}>
                      Mark Flagged
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateCommentStatus(comment.id, "deleted")}>
                      Mark Deleted
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
