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
  excerpt?: string
  date?: string
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
  excerpt,
  date,
  featuredImage,
  variant = "outline",
  size = "sm",
  className = "",
  onAddSuccess,
  onRemoveSuccess,
}: BookmarkButtonProps) => {
  const { user } = useUser()
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Ensure postId is valid
  const validPostId = postId || `post-${slug}`
  const isMarked = isBookmarked(validPostId)

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

    // Validate required data before proceeding
    if (!validPostId) {
      toast({
        title: "Error",
        description: "Invalid post data. Cannot bookmark this post.",
        variant: "destructive",
      })
      return
    }

    try {
      await toggleBookmark({
        post_id: validPostId,
        title: title || "Untitled Post",
        slug: slug || "",
        date: date || new Date().toISOString(),
        excerpt: excerpt || "",
        featuredImage: featuredImage
          ? {
              node: {
                sourceUrl: featuredImage.url,
              },
            }
          : undefined,
      })

      // Call the appropriate callback based on the new bookmark state
      // Since we're using toggle, we need to check the state after the operation
      if (isBookmarked(validPostId)) {
        onRemoveSuccess?.()
      } else {
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
