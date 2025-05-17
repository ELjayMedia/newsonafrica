"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { addComment, isRateLimited, createOptimisticComment } from "@/lib/comment-service"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, Bold, Italic, LinkIcon, Code } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Toggle } from "@/components/ui/toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  const [isRichText, setIsRichText] = useState(false)
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user, profile } = useUser()
  const { toast } = useToast()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current && activeTab === "write") {
      textareaRef.current.focus()
    }
  }, [activeTab])

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
        is_rich_text: isRichText,
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
      setActiveTab("write")

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

  const insertMarkdown = (prefix: string, suffix = "") => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    // If text is selected, wrap it with markdown
    // If no text is selected, insert markdown with cursor in the middle
    const newText = selectedText
      ? content.substring(0, start) + prefix + selectedText + suffix + content.substring(end)
      : content.substring(0, start) + prefix + suffix + content.substring(end)

    setContent(newText)

    // Set cursor position
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
      return <p className="text-gray-400 italic">Nothing to preview</p>
    }

    if (!isRichText) {
      return <div className="whitespace-pre-wrap">{content}</div>
    }

    // Simple markdown rendering for preview
    const html = content
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Links
      .replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
      // Code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded">$1</code>')
      // Line breaks
      .replace(/\n/g, "<br />")

    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }

  if (!user) {
    return (
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm text-center">
        <h4 className="font-semibold mb-2">Join the conversation</h4>
        <p className="text-gray-600 mb-4">Sign in to share your thoughts on this article.</p>
        <Button asChild>
          <Link
            href={`/auth?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}#comments`}
          >
            Sign in to comment
          </Link>
        </Button>
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
              disabled={isSubmitting || remainingTime > 0}
              className="min-h-[100px] resize-y pr-16"
              aria-label="Comment text"
              maxLength={2000}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">{content.length}/2000</div>
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
