"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, Bold, Code, Italic, LinkIcon, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Toggle } from "@/components/ui/toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/UserContext"
import { addComment, ApiRequestError, createOptimisticComment } from "@/lib/comment-service"
import { renderRichTextComment } from "@/lib/comments/rich-text-renderer"
import type { Comment } from "@/lib/supabase-schema"

export interface CommentFormProps {
  postId: string
  editionCode: string
  parentId?: string | null
  placeholder?: string
  onCommentAdded: (optimisticComment?: Comment) => void
  onCancel?: () => void

  // Optional: rate limiting helpers (passed from CommentList)
  isRateLimited?: () => boolean
  rateLimitTimeRemaining?: () => number
}

export function CommentForm({
  postId,
  editionCode,
  parentId = null,
  onCommentAdded,
  onCancel,
  placeholder = "Write your comment here...",
  isRateLimited,
  rateLimitTimeRemaining,
}: CommentFormProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Internal rate limit (HTTP 429 Retry-After)
  const [remainingTime, setRemainingTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [isRichText, setIsRichText] = useState(false)
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { user, profile } = useUser()
  const { toast } = useToast()

  // Optional external rate limit from parent (CommentList)
  const externallyLimited = isRateLimited?.() ?? false
  const externalSecondsLeft = rateLimitTimeRemaining?.() ?? 0

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Clear internal rate-limit error when countdown finishes
  useEffect(() => {
    if (remainingTime === 0 && error?.startsWith("Rate limited.")) {
      setError(null)
    }
  }, [remainingTime, error])

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

    if (externallyLimited) {
      toast({
        title: "Slow down",
        description: `Please wait ${externalSecondsLeft}s before commenting again.`,
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

    setIsSubmitting(true)
    setError(null)

    try {
      const commentData = {
        wp_post_id: postId,
        edition_code: editionCode,
        user_id: user.id,
        body: content.trim(),
        parent_id: parentId,
        is_rich_text: isRichText,
      }

      const optimisticComment = createOptimisticComment(
        commentData,
        profile?.username || user.email?.split("@")[0] || "User",
        profile?.avatar_url,
      )

      // Optimistic UI update
      onCommentAdded(optimisticComment)

      // Reset form immediately
      setContent("")
      setActiveTab("write")

      // Submit to server
      await addComment(commentData)

      // Ask parent to refresh / finalize
      onCommentAdded()

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      })
    } catch (err: unknown) {
      console.error("Failed to post comment:", err)

      if (err instanceof ApiRequestError && err.status === 429) {
        const retryAfterSeconds = err.retryAfterSeconds ?? 1
        setRemainingTime(retryAfterSeconds)
        setError(err.message)

        if (timerRef.current) clearInterval(timerRef.current)

        timerRef.current = setInterval(() => {
          setRemainingTime((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        toast({
          title: "Slow down",
          description: err.message,
          variant: "destructive",
        })
      } else if (
        err instanceof Error &&
        (err.message.includes("status") || err.message.includes("column") || err.message.includes("schema"))
      ) {
        setError("The comment system needs a database update. Your comment may still be posted.")
        toast({
          title: "Comment failed",
          description: "Failed to post your comment. Please try again.",
          variant: "destructive",
        })
      } else {
        setError("Failed to post your comment. Please try again.")
        toast({
          title: "Comment failed",
          description: "Failed to post your comment. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const insertMarkdown = (prefix: string, suffix = "") => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    const newText = selectedText
      ? content.substring(0, start) + prefix + selectedText + suffix + content.substring(end)
      : content.substring(0, start) + prefix + suffix + content.substring(end)

    setContent(newText)

    setTimeout(() => {
      textarea.focus()
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length)
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length)
      }
    }, 0)
  }

  const renderPreview = () => {
    if (!content.trim()) {
      return <p className="text-gray-600 dark:text-gray-300 italic">Nothing to preview</p>
    }

    if (!isRichText) {
      return <div className="whitespace-pre-wrap">{content}</div>
    }

    return <div>{renderRichTextComment(content)}</div>
  }

  if (!user) {
    return (
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm text-center">
        <h4 className="font-semibold mb-2">Join the conversation</h4>
        <p className="text-gray-600 mb-4">Sign in to share your thoughts on this article.</p>
        <Button asChild>
          <Link href={`/auth?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}#comments`}>
            Sign in to comment
          </Link>
        </Button>
      </div>
    )
  }

  const disabledByRateLimit = remainingTime > 0 || externallyLimited
  const rateLimitSeconds = remainingTime > 0 ? remainingTime : externalSecondsLeft

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "write" | "preview")} className="w-full">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-1">
            <Toggle
              size="sm"
              pressed={isRichText}
              onPressedChange={setIsRichText}
              aria-label="Toggle rich text"
              className="data-[state=on]:bg-blue-50 data-[state=on]:text-blue-600"
            >
              Rich Text
            </Toggle>
          </div>
        </div>

        <TabsContent value="write" className="mt-0">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              required
              disabled={isSubmitting || disabledByRateLimit}
              className="min-h-[100px] resize-y pr-16"
              aria-label="Comment text"
              maxLength={2000}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">{content.length}/2000</div>
          </div>

          {isRichText && (
            <div className="flex items-center space-x-1 mt-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("**", "**")}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("*", "*")}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("[", "](https://)")}
                title="Link"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("`", "`")}
                title="Code"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div className="min-h-[100px] p-3 border rounded-md bg-gray-50">{renderPreview()}</div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} aria-label="Cancel comment">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || disabledByRateLimit || !content.trim()}
          aria-label={parentId ? "Post reply" : "Post comment"}
        >
          {isSubmitting ? (
            <span className="flex items-center" role="status" aria-live="polite">
              <Loader2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Posting...
            </span>
          ) : disabledByRateLimit ? (
            `Wait ${rateLimitSeconds}s`
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
