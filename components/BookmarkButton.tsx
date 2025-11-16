"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useUser } from "@/contexts/UserContext"
import { useBookmarks } from "@/contexts/BookmarksContext"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface BookmarkButtonProps {
  editionCode?: string
  collectionId?: string | null
  postId: string
  title?: string
  slug?: string
  excerpt?: string
  featuredImage?: any
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showText?: boolean
  compact?: boolean
  onBookmarkChange?: (isBookmarked: boolean) => void
}

export const BookmarkButton = ({
  postId,
  editionCode,
  collectionId,
  title = "Untitled Post",
  slug = "",
  excerpt = "",
  featuredImage,
  variant = "outline",
  size = "sm",
  className = "",
  showText = true,
  compact = false,
  onBookmarkChange,
}: BookmarkButtonProps) => {
  const { user } = useUser()
  const { isBookmarked, addBookmark, removeBookmark, isLoading } = useBookmarks()
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const isMarked = isBookmarked(postId)
  const isDisabled = isProcessing || isLoading

  const handleBookmarkToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to bookmark articles",
          variant: "destructive",
        })
        return
      }

      if (isDisabled) return

      try {
        setIsProcessing(true)

        const wasBookmarked = isMarked

        if (wasBookmarked) {
          await removeBookmark(postId)
          toast({
            title: "Bookmark removed",
            description: "Article removed from your bookmarks",
          })
        } else {
          await addBookmark({
            wp_post_id: postId,
            edition_code: editionCode,
            collection_id: collectionId || undefined,
            title,
            slug,
            excerpt,
            featuredImage,
          })
          toast({
            title: "Bookmarked!",
            description: "Article saved to your bookmarks",
          })
        }

        // Notify parent component of change
        onBookmarkChange?.(!wasBookmarked)
      } catch (error) {
        console.error("Error toggling bookmark:", error)
        toast({
          title: "Error",
          description: "Failed to update bookmark. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [
      user,
      isMarked,
      isDisabled,
      postId,
      editionCode,
      collectionId,
      title,
      slug,
      excerpt,
      featuredImage,
      addBookmark,
      removeBookmark,
      toast,
      onBookmarkChange,
    ],
  )

  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <span className="flex items-center" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
          {showText && !compact && <span className="ml-2">Saving...</span>}
        </span>
      )
    }

    if (isMarked) {
      return (
        <>
          <BookmarkCheck className="h-4 w-4 text-blue-600 fill-current" />
          {showText && !compact && <span className="ml-2">Saved</span>}
        </>
      )
    }

    return (
      <>
        <Bookmark className="h-4 w-4" />
        {showText && !compact && <span className="ml-2">Save</span>}
      </>
    )
  }

  return (
    <Button
      variant={isMarked ? "secondary" : variant}
      size={compact ? "icon" : size}
      onClick={handleBookmarkToggle}
      disabled={isDisabled}
      className={cn(
        "transition-all duration-200",
        isMarked && "bg-blue-50 border-blue-200 hover:bg-blue-100",
        isDisabled && "opacity-50 cursor-not-allowed",
        compact && "h-8 w-8",
        className,
      )}
      aria-label={isMarked ? "Remove bookmark" : "Add bookmark"}
      title={isMarked ? "Remove from bookmarks" : "Save to bookmarks"}
    >
      {getButtonContent()}
    </Button>
  )
}

export default BookmarkButton
