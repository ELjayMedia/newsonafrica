"use client"

import { useCallback } from "react"
import type { MouseEvent } from "react"
import { useUser } from "@/contexts/UserContext"
import { useBookmarks } from "@/contexts/BookmarksContext"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useRouter } from "next/navigation"

interface BookmarkButtonProps {
  postId: string
  title?: string
  slug?: string
  excerpt?: string
  date?: string
  featuredImage?: {
    url?: string
    node?: {
      sourceUrl?: string
    }
    width?: number
    height?: number
  }
  variant?: "default" | "outline" | "ghost" | "secondary"
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
  const router = useRouter()
  const { user, isAuthenticated } = useUser()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { toast } = useToast()
  const isMarked = isBookmarked(postId)

  const handleBookmarkToggle = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!isAuthenticated) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to save bookmarks",
          variant: "destructive",
        })

        // Redirect to auth page with return URL
        router.push(`/auth?redirectTo=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      try {
        if (isMarked) {
          await removeBookmark(postId)
          onRemoveSuccess?.()
        } else {
          // Normalize the featuredImage format
          const normalizedFeaturedImage = featuredImage
            ? {
                node: {
                  sourceUrl: featuredImage.url || featuredImage.node?.sourceUrl || "",
                },
              }
            : undefined

          await addBookmark({
            post_id: postId,
            title,
            slug,
            excerpt,
            date,
            featuredImage: normalizedFeaturedImage,
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
    },
    [
      isAuthenticated,
      isMarked,
      postId,
      title,
      slug,
      excerpt,
      date,
      featuredImage,
      addBookmark,
      removeBookmark,
      onAddSuccess,
      onRemoveSuccess,
      toast,
      router,
    ],
  )

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBookmarkToggle}
      className={className}
      aria-label={isMarked ? "Remove bookmark" : "Add bookmark"}
      title={isMarked ? "Remove bookmark" : "Add bookmark"}
    >
      <Bookmark className={`h-4 w-4 ${size !== "icon" ? "mr-2" : ""} ${isMarked ? "fill-current text-primary" : ""}`} />
      {size !== "icon" && isDesktop && (isMarked ? "Bookmarked" : "Bookmark")}
    </Button>
  )
}
