"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { wpProxyRequest } from "@/lib/wp-proxy-client"
import { DEFAULT_COUNTRY } from "@/lib/wordpress/shared"

interface Comment {
  id: number
  author_name: string
  content: { rendered: string }
  date: string
  status: string
  post: number
}

export function CommentModeration() {
  const [pendingComments, setPendingComments] = useState<Comment[]>([])

  useEffect(() => {
    const loadPendingComments = async () => {
      try {
        const comments = await wpProxyRequest<Comment[]>({
          endpoint: "comments",
          method: "GET",
          params: { status: "hold", per_page: 100, _embed: 1 },
          countryCode: DEFAULT_COUNTRY,
        })
        setPendingComments(comments ?? [])
      } catch (error) {
        console.error("Failed to load pending comments:", error)
        setPendingComments([])
      }
    }
    loadPendingComments()
  }, [])

  const handleApprove = async (commentId: number) => {
    try {
      await wpProxyRequest<Comment>({
        endpoint: `comments/${commentId}`,
        method: "POST",
        payload: { status: "approve" },
        countryCode: DEFAULT_COUNTRY,
      })
      setPendingComments(pendingComments.filter((comment) => comment.id !== commentId))
    } catch (error) {
      console.error("Failed to approve comment:", error)
    }
  }

  const handleDelete = async (commentId: number) => {
    try {
      await wpProxyRequest<Comment>({
        endpoint: `comments/${commentId}`,
        method: "DELETE",
        countryCode: DEFAULT_COUNTRY,
      })
      setPendingComments(pendingComments.filter((comment) => comment.id !== commentId))
    } catch (error) {
      console.error("Failed to delete comment:", error)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Comment Moderation</h2>
      {pendingComments.length === 0 ? (
        <p>No pending comments.</p>
      ) : (
        pendingComments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{comment.author_name}</p>
                <p className="text-sm text-gray-500">{new Date(comment.date).toLocaleDateString()}</p>
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={() => handleApprove(comment.id)} className="mr-2">
                  Approve
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(comment.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: comment.content.rendered }} className="mt-2" />
            <p className="text-sm text-gray-500 mt-2">Post ID: {comment.post}</p>
          </div>
        ))
      )}
    </div>
  )
}
