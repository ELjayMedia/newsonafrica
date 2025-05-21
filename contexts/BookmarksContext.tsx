"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Bookmark {
  id: string
  post_id: string
  title: string
  slug: string
  date: string
  excerpt: string
  featuredImage: {
    node: {
      sourceUrl: string
    }
  }
}

interface BookmarksContextType {
  bookmarks: Bookmark[]
  loading: boolean
  toggleBookmark: (post: Omit<Bookmark, "id">) => Promise<void>
  removeBookmark: (postId: string) => Promise<void>
  isBookmarked: (postId: string) => boolean
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined)

export function useBookmarks() {
  const context = useContext(BookmarksContext)
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider")
  }
  return context
}

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch bookmarks when user changes
  useEffect(() => {
    if (user) {
      fetchBookmarks()
    } else {
      setBookmarks([])
      setLoading(false)
    }
  }, [user])

  const fetchBookmarks = async () => {
    try {
      setLoading(true)

      if (!user) {
        setBookmarks([])
        return
      }

      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching bookmarks:", error)
        return
      }

      setBookmarks(data as Bookmark[])
    } catch (error) {
      console.error("Error fetching bookmarks:", error)
    } finally {
      setLoading(false)
    }
  }

  // New function that uses the handle_bookmark RPC
  const toggleBookmark = useCallback(
    async (post: Omit<Bookmark, "id">) => {
      if (!user) return

      try {
        // Validate required fields
        if (!post.post_id) {
          throw new Error("Post ID is required for bookmarking")
        }

        // Call the handle_bookmark RPC function
        const { data, error } = await supabase.rpc("handle_bookmark", {
          p_user_id: user.id,
          p_post_id: post.post_id,
          p_title: post.title || "Untitled Post",
          p_slug: post.slug || "",
          p_date: post.date || new Date().toISOString(),
          p_excerpt: post.excerpt || "",
          p_featured_image: post.featuredImage ? JSON.stringify(post.featuredImage) : null,
          p_action: "toggle", // Toggle the bookmark status
        })

        if (error) {
          console.error("Error toggling bookmark:", error)
          toast({
            title: "Error",
            description: `Failed to update bookmark: ${error.message}`,
            variant: "destructive",
          })
          return
        }

        // Refresh bookmarks to get the updated state
        await fetchBookmarks()

        // Show success message based on the action performed
        const wasAdded = data?.action === "added"
        toast({
          title: wasAdded ? "Bookmarked" : "Bookmark Removed",
          description: wasAdded ? "Article added to your bookmarks" : "Article removed from your bookmarks",
        })
      } catch (error: any) {
        console.error("Failed to toggle bookmark:", error)
        toast({
          title: "Error",
          description: `Failed to update bookmark: ${error.message}`,
          variant: "destructive",
        })
      }
    },
    [user, toast, supabase],
  )

  // Keep the removeBookmark function for backward compatibility
  const removeBookmark = useCallback(
    async (postId: string) => {
      if (!user || !postId) return

      try {
        // Call the handle_bookmark RPC function with 'remove' action
        const { error } = await supabase.rpc("handle_bookmark", {
          p_user_id: user.id,
          p_post_id: postId,
          p_title: "",
          p_slug: "",
          p_date: new Date().toISOString(),
          p_excerpt: "",
          p_featured_image: null,
          p_action: "remove",
        })

        if (error) {
          console.error("Error removing bookmark:", error)
          toast({
            title: "Error",
            description: "Failed to remove bookmark",
            variant: "destructive",
          })
          return
        }

        // Remove the bookmark from state
        setBookmarks((prev) => prev.filter((b) => b.post_id !== postId))

        toast({
          title: "Bookmark removed",
          description: "Article removed from your bookmarks",
        })
      } catch (error) {
        console.error("Failed to remove bookmark:", error)
        toast({
          title: "Error",
          description: "Failed to remove bookmark",
          variant: "destructive",
        })
      }
    },
    [user, toast, supabase],
  )

  const isBookmarked = useCallback(
    (postId: string) => {
      if (!postId) return false
      return bookmarks.some((b) => b.post_id === postId)
    },
    [bookmarks],
  )

  const contextValue = useMemo(
    () => ({
      bookmarks,
      loading,
      toggleBookmark, // Replace addBookmark with toggleBookmark
      removeBookmark,
      isBookmarked,
    }),
    [bookmarks, loading, toggleBookmark, removeBookmark, isBookmarked],
  )

  return <BookmarksContext.Provider value={contextValue}>{children}</BookmarksContext.Provider>
}
