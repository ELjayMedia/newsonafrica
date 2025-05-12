"use client"

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import type { ReactNode } from "react"
import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

export interface Bookmark {
  id: string
  post_id: string
  title?: string
  slug?: string
  excerpt?: string
  date?: string
  featuredImage?: {
    node?: {
      sourceUrl?: string
    }
  }
  created_at: string
}

interface BookmarksContextType {
  bookmarks: Bookmark[]
  loading: boolean
  error: string | null
  addBookmark: (post: Omit<Bookmark, "id" | "created_at">) => Promise<void>
  removeBookmark: (postId: string) => Promise<void>
  isBookmarked: (postId: string) => boolean
  refreshBookmarks: () => Promise<void>
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined)

export function useBookmarks() {
  const context = useContext(BookmarksContext)
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider")
  }
  return context
}

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching bookmarks:", error)
        setError(error.message)
        return
      }

      setBookmarks(data || [])
    } catch (err: any) {
      console.error("Failed to fetch bookmarks:", err)
      setError(err.message || "Failed to load bookmarks")
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  // Fetch bookmarks when user changes
  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  const addBookmark = useCallback(
    async (post: Omit<Bookmark, "id" | "created_at">) => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to save bookmarks",
          variant: "destructive",
        })
        return
      }

      try {
        // Check if already bookmarked to prevent duplicates
        if (isBookmarked(post.post_id)) {
          return
        }

        const { data, error } = await supabase
          .from("bookmarks")
          .insert({
            user_id: user.id,
            post_id: post.post_id,
            title: post.title || "Untitled",
            slug: post.slug,
            excerpt: post.excerpt,
            date: post.date,
            featuredImage: post.featuredImage,
          })
          .select()
          .single()

        if (error) {
          console.error("Error adding bookmark:", error)
          toast({
            title: "Error",
            description: "Failed to bookmark article",
            variant: "destructive",
          })
          return
        }

        // Add the new bookmark to the state
        setBookmarks((prev) => [data as Bookmark, ...prev])

        toast({
          title: "Bookmarked",
          description: "Article added to your bookmarks",
        })
      } catch (error: any) {
        console.error("Failed to add bookmark:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to bookmark article",
          variant: "destructive",
        })
      }
    },
    [user, toast, supabase],
  )

  const removeBookmark = useCallback(
    async (postId: string) => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to manage bookmarks",
          variant: "destructive",
        })
        return
      }

      try {
        const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId)

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
      } catch (error: any) {
        console.error("Failed to remove bookmark:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to remove bookmark",
          variant: "destructive",
        })
      }
    },
    [user, toast, supabase],
  )

  const isBookmarked = useCallback((postId: string) => bookmarks.some((b) => b.post_id === postId), [bookmarks])

  const refreshBookmarks = useCallback(() => fetchBookmarks(), [fetchBookmarks])

  const contextValue = useMemo(
    () => ({
      bookmarks,
      loading,
      error,
      addBookmark,
      removeBookmark,
      isBookmarked,
      refreshBookmarks,
    }),
    [bookmarks, loading, error, addBookmark, removeBookmark, isBookmarked, refreshBookmarks],
  )

  return <BookmarksContext.Provider value={contextValue}>{children}</BookmarksContext.Provider>
}
