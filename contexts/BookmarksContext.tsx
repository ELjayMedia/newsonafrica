"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Bookmark {
  id: string
  user_id: string
  post_id: string
  title: string
  slug?: string
  excerpt?: string
  created_at: string
  featured_image?: any
}

interface BookmarksContextType {
  bookmarks: Bookmark[]
  loading: boolean
  addBookmark: (post: Omit<Bookmark, "id" | "user_id" | "created_at">) => Promise<void>
  removeBookmark: (postId: string) => Promise<void>
  toggleBookmark: (post: Omit<Bookmark, "id" | "user_id" | "created_at">) => Promise<void>
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

interface BookmarksProviderProps {
  children: React.ReactNode
}

export function BookmarksProvider({ children }: BookmarksProviderProps) {
  const { user } = useUser()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const isBookmarked = useCallback(
    (postId: string) => {
      if (!postId) return false
      return bookmarks.some((b) => b.post_id === postId)
    },
    [bookmarks],
  )

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
        toast({
          title: "Error",
          description: `Failed to load bookmarks: ${error.message}`,
          variant: "destructive",
        })
        return
      }

      setBookmarks(data || [])
    } catch (error: any) {
      console.error("Error fetching bookmarks:", error)
      toast({
        title: "Error",
        description: `Failed to load bookmarks: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addBookmark = useCallback(
    async (post: Omit<Bookmark, "id" | "user_id" | "created_at">) => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to save bookmarks",
          variant: "destructive",
        })
        return
      }

      try {
        if (isBookmarked(post.post_id)) {
          toast({
            title: "Already bookmarked",
            description: "This article is already in your bookmarks",
          })
          return
        }

        let processedFeaturedImage = null
        if (post.featured_image) {
          try {
            if (typeof post.featured_image === "string") {
              processedFeaturedImage = post.featured_image
            } else {
              processedFeaturedImage = JSON.stringify(post.featured_image)
            }
          } catch (e) {
            console.error("Error processing featured image:", e)
            processedFeaturedImage = null
          }
        }

        const bookmarkData = {
          user_id: user.id,
          post_id: post.post_id,
          title: post.title || "Untitled Post",
          slug: post.slug || "",
          excerpt: post.excerpt || "",
          featured_image: processedFeaturedImage,
        }

        const { data, error } = await supabase.from("bookmarks").insert(bookmarkData).select().single()

        if (error) {
          console.error("Error adding bookmark:", error)
          toast({
            title: "Error",
            description: `Failed to add bookmark: ${error.message}`,
            variant: "destructive",
          })
          return
        }

        setBookmarks((prev) => [data, ...prev])

        toast({
          title: "Bookmarked",
          description: "Article added to your bookmarks",
        })
      } catch (error: any) {
        console.error("Failed to add bookmark:", error)
        toast({
          title: "Error",
          description: `Failed to add bookmark: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      }
    },
    [user, toast, supabase, isBookmarked],
  )

  const removeBookmark = useCallback(
    async (postId: string) => {
      if (!user || !postId) return

      try {
        const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId)

        if (error) {
          console.error("Error removing bookmark:", error)
          toast({
            title: "Error",
            description: `Failed to remove bookmark: ${error.message}`,
            variant: "destructive",
          })
          return
        }

        setBookmarks((prev) => prev.filter((b) => b.post_id !== postId))

        toast({
          title: "Bookmark removed",
          description: "Article removed from your bookmarks",
        })
      } catch (error: any) {
        console.error("Failed to remove bookmark:", error)
        toast({
          title: "Error",
          description: `Failed to remove bookmark: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      }
    },
    [user, toast, supabase],
  )

  const toggleBookmark = useCallback(
    async (post: Omit<Bookmark, "id" | "user_id" | "created_at">) => {
      if (isBookmarked(post.post_id)) {
        await removeBookmark(post.post_id)
      } else {
        await addBookmark(post)
      }
    },
    [addBookmark, removeBookmark, isBookmarked],
  )

  const refreshBookmarks = useCallback(async () => {
    await fetchBookmarks()
  }, [user])

  const contextValue = useMemo(
    () => ({
      bookmarks,
      loading,
      addBookmark,
      removeBookmark,
      toggleBookmark,
      isBookmarked,
      refreshBookmarks,
    }),
    [bookmarks, loading, addBookmark, removeBookmark, toggleBookmark, isBookmarked, refreshBookmarks],
  )

  return <BookmarksContext.Provider value={contextValue}>{children}</BookmarksContext.Provider>
}
