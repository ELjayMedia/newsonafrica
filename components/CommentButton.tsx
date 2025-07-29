"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthProvider"
import { useToast } from "@/hooks/use-toast"

interface CommentButtonProps {
  commentCount?: number
  className?: string
}

export function CommentButton({ commentCount, className }: CommentButtonProps) {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  const handleClick = () => {
    // Smooth scroll to the comments section
    const commentsSection = document.getElementById("comments")
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" })
    }

    // Display a toast if not authenticated
    if (!isAuthenticated) {
      toast({
        title: "Sign in to comment",
        description: "Join the conversation by signing in to your account",
        duration: 3000,
      })
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className={className} aria-label="View comments">
      <MessageSquare className="h-4 w-4 mr-1" />
      {commentCount !== undefined ? `${commentCount} Comments` : "Comments"}
    </Button>
  )
}
