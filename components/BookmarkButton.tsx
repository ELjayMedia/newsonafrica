"use client"

import type React from "react"
import { useUser } from "@/contexts/UserContext"
import { useBookmarks } from "@/contexts/BookmarksContext"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface BookmarkButtonProps {
  postId: string
  title?: string
  slug?: string
  featuredImage?: {
    url: string
    width?: number
    height?: number
  }
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  onAddSuccess?: () => void
  onRemoveSuccess?: () => void
}

export const BookmarkButton = ({
  postId,
  title,
  slug,
  featuredImage,
  variant = "outline",
  size = "sm",
  className = "",
  onAddSuccess,
  onRemoveSuccess,
}: BookmarkButtonProps) => {
  const { user } = useUser()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const isMarked = isBookmarked(postId)

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
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
      if (isMarked) {
        await removeBookmark(postId)
        onRemoveSuccess?.()
      } else {
        await addBookmark({
          post_id: postId,
          featuredImage: featuredImage
            ? {
                node: {
                  sourceUrl: featuredImage.url,
                },
              }
            : undefined,
        })
        onAddSuccess?.()
      }
    } catch (error: any) {
      console.error("Failed to toggle bookmark:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to toggle bookmark",
        variant: "destructive",
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBookmarkToggle}
      className={className}
      aria-label={isMarked ? "Remove bookmark" : "Add bookmark"}
    >
      <Bookmark className={`h-4 w-4 mr-2 ${isMarked ? "fill-current text-blue-600" : "text-gray-400"}`} />
      {isDesktop && (isMarked ? "Remove Bookmark" : "Add Bookmark")}
    </Button>
  )
}
