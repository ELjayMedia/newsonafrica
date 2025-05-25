"use client"

import type React from "react"
import { useState } from "react"
import { useUser } from "@/contexts/UserContext"
import { useBookmarks } from "@/contexts/BookmarksContext"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BookmarkButtonProps {
  postId: string
  title?: string
  slug?: string
  excerpt?: string
  featuredImage?: any
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  postId,
  title = "Untitled Post",
  slug = "",
  excerpt = "",
  featuredImage,
  variant = "outline",
  size = "sm",
  className = "",
}) => {
  const { user } = useUser()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const isMarked = isBookmarked(postId)

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save bookmarks",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)

      if (isMarked) {
        await removeBookmark(postId)
      } else {
        await addBookmark({
          post_id: postId,
          title,
          slug,
          excerpt,
          featured_image: featuredImage,
        })
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBookmarkToggle}
      disabled={isProcessing}
      className={className}
      aria-label={isMarked ? "Remove bookmark" : "Add bookmark"}
    >
      <Bookmark className={`h-4 w-4 ${isMarked ? "fill-current text-blue-600" : "text-gray-400"}`} />
      <span className="ml-2">{isMarked ? "Saved" : "Save"}</span>
      {isProcessing && (
        <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></span>
      )}
    </Button>
  )
}

export default BookmarkButton
