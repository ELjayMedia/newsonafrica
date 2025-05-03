"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { addComment, isRateLimited, createOptimisticComment } from "@/lib/comment-service"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CommentFormProps {
  postId: string
  parentId?: string | null
  onCommentAdded: (optimisticComment?: any) => void
  onCancel?: () => void
  placeholder?: string
}

export function CommentForm({
  postId,
  parentId = null,
  onCommentAdded,
  onCancel,
  placeholder = "Write your comment here...",
}: CommentFormProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingTime, setRemainingTime] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user, profile } = useUser()
  const { toast } = useToast()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to comment",
        variant: "destructive",
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: "Empty comment",
        description: "Please write something before submitting",
        variant: "destructive",
      })
      return
    }

    // Check rate limiting
    if (isRateLimited(user.id)) {
      const lastSubmission = localStorage.getItem(`lastCommentSubmission_${user.id}`)
      const lastSubmissionTime = lastSubmission ? Number.parseInt(lastSubmission, 10) : 0
      const timeElapsed = Date.now() - lastSubmissionTime
      const timeRemaining = Math.ceil((10000 - timeElapsed) / 1000)

      setRemainingTime(timeRemaining)
      setError(`Please wait ${timeRemaining} seconds before posting another comment`)

      // Start countdown timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            setError(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create the comment object
      const commentData = {
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parentId,
      }

      // Create an optimistic version of the comment for immediate UI update
      const optimisticComment = createOptimisticComment(
        commentData,
        profile?.username || user.email?.split("@")[0] || "User",
        profile?.avatar_url,
      )

      // Update UI immediately with optimistic comment
      onCommentAdded(optimisticComment)

      // Store submission time for rate limiting
      localStorage.setItem(`lastCommentSubmission_${user.id}`, Date.now().toString())

      // Reset form
      setContent("")

      // Actually submit to the server
      await addComment(commentData)

      // Notify parent that a real comment was added (to refresh the list)
      onCommentAdded()

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      })
    } catch (error: any) {
      console.error("Failed to post comment:", error)

      // Check if this is a schema-related error
      if (
        error.message &&
        (error.message.includes("status") || error.message.includes("column") || error.message.includes("schema"))
      ) {
        setError("The comment system needs a database update. Your comment may still be posted.")
      } else {
        setError("Failed to post your comment. Please try again.")
      }

      toast({
        title: "Comment failed",
        description: "Failed to post your comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-gray-50 p-4 rounded-md text-center">
        <p className="text-gray-600">
          Please{" "}
          <Link href="/auth?redirectTo=back" className="text-blue-600 hover:underline font-medium">
            sign in
          </Link>{" "}
          to leave a comment.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          required
          disabled={isSubmitting || remainingTime > 0}
          className="min-h-[100px] resize-y pr-16"
          aria-label="Comment text"
          maxLength={2000}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">{content.length}/2000</div>
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Cancel comment"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || remainingTime > 0 || !content.trim()}
          aria-label={parentId ? "Post reply" : "Post comment"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : remainingTime > 0 ? (
            `Wait ${remainingTime}s`
          ) : parentId ? (
            "Reply"
          ) : (
            "Post Comment"
          )}
        </Button>
      </div>
    </form>
  )
}
