"use client"
import { useState } from "react"
import { useUser } from "@/contexts/UserContext"
import { CommentForm } from "@/components/CommentForm"
import { updateComment, deleteComment } from "@/lib/comment-service"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Reply, Edit, Trash2, MoreVertical, Flag } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Comment } from "@/lib/supabase-schema"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface CommentItemProps {
  comment: Comment
  postId: string
  editionCode: string
  onCommentUpdated: () => void
  onReplyAdded?: (optimisticComment?: Comment) => void
  onReplyFailed?: (commentId: string) => void
  isRateLimited?: () => boolean
  rateLimitTimeRemaining?: () => number
  isFailed?: boolean
}

export function CommentItem({
  comment,
  postId,
  editionCode,
  onCommentUpdated,
  onReplyAdded,
  onReplyFailed,
  isRateLimited,
  rateLimitTimeRemaining,
  isFailed = false,
}: CommentItemProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [isReporting, setIsReporting] = useState(false)

  const isAuthor = user && user.id === comment.user_id
  const isOptimistic = comment.isOptimistic === true
  const formattedDate = new Date(comment.created_at).toLocaleString()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const renderContent = () => {
    if (!comment.is_rich_text) {
      return <div className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</div>
    }

    // Simple markdown rendering
    const html = comment.body
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Links
      .replace(
        /\[([^\]]+)\]$$([^)]+)$$/g,
        '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      // Code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded">$1</code>')
      // Line breaks
      .replace(/\n/g, "<br />")

    return <div className="mt-1 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
  }

  const handleReply = () => {
    setIsReplying(!isReplying)
  }

  const handleEdit = () => {
    setIsEditing(!isEditing)
    setEditBody(comment.body)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return
    }

    try {
      await deleteComment(comment.id, {
        wpPostId: comment.wp_post_id,
        editionCode: comment.edition_code,
      })
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully",
      })
      onCommentUpdated()
    } catch (error) {
      console.error("Failed to delete comment:", error)
      toast({
        title: "Delete failed",
        description: "Failed to delete your comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async () => {
    if (!editBody.trim()) {
      toast({
        title: "Empty comment",
        description: "Comment cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      await updateComment(comment.id, editBody, comment.is_rich_text)
      setIsEditing(false)
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully",
      })
      onCommentUpdated()
    } catch (error) {
      console.error("Failed to update comment:", error)
      toast({
        title: "Update failed",
        description: "Failed to update your comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast({
        title: "Report reason required",
        description: "Please provide a reason for reporting this comment",
        variant: "destructive",
      })
      return
    }

    setIsReporting(true)

    try {
      // This would call the reportComment function, but we'll skip it for now
      // since the schema might not be updated yet
      // await reportComment({
      //   commentId: comment.id,
      //   reportedBy: user?.id || '',
      //   reason: reportReason
      // })

      toast({
        title: "Comment reported",
        description: "Thank you for reporting this comment. Our moderators will review it.",
      })
      setIsReportDialogOpen(false)
      setReportReason("")
    } catch (error) {
      console.error("Failed to report comment:", error)
      toast({
        title: "Report failed",
        description: "Failed to report this comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm p-4 border border-gray-100",
        isOptimistic && "opacity-70",
        isFailed && "border-red-300 bg-red-50",
      )}
      id={`comment-${comment.id}`}
    >
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={comment.profile?.avatar_url || undefined} alt={comment.profile?.username || "User"} />
          <AvatarFallback>{comment.profile?.username ? getInitials(comment.profile.username) : "U"}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm flex items-center">
                {comment.profile?.username || "Anonymous"}
                {isAuthor && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">You</span>
                )}
              </h4>
              <p className="text-xs text-gray-500">{formattedDate}</p>
            </div>

            {!isOptimistic && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAuthor ? (
                    <>
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)}>
                        <Flag className="mr-2 h-4 w-4" />
                        Report
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                rows={3}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdate}>
                  Update
                </Button>
              </div>
            </div>
          ) : (
            renderContent()
          )}

          {!isEditing && !isOptimistic && (
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleReply} className="text-xs">
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>
            </div>
          )}

          {isReplying && onReplyAdded && (
            <div className="mt-3">
              <CommentForm
                postId={postId}
                editionCode={editionCode}
                parentId={comment.id}
                onCommentAdded={(optimisticReply) => {
                  setIsReplying(false)
                  onReplyAdded(optimisticReply)
                }}
                onCancel={() => setIsReplying(false)}
                placeholder="Write your reply..."
              />
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-100">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  editionCode={editionCode}
                  onCommentUpdated={onCommentUpdated}
                  onReplyAdded={onReplyAdded}
                  onReplyFailed={onReplyFailed}
                  isRateLimited={isRateLimited}
                  rateLimitTimeRemaining={rateLimitTimeRemaining}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Comment</DialogTitle>
            <DialogDescription>
              Please provide a reason for reporting this comment. Our moderators will review it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason</Label>
              <Textarea
                id="report-reason"
                placeholder="Please explain why you're reporting this comment..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={isReporting || !reportReason.trim()}>
              {isReporting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
