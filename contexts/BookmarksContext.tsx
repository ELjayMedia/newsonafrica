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
  addBookmark: (post: Omit<Bookmark, "id">) => Promise<void>
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

  const addBookmark = useCallback(
    async (post: Omit<Bookmark, "id">) => {
      if (!user) return

      try {
        // Check if already bookmarked
        if (isBookmarked(post.post_id)) {
          return
        }

        const { data, error } = await supabase
          .from("bookmarks")
          .insert({
            user_id: user.id, // Explicitly pass the user_id
            post_id: post.post_id,
            title: post.title,
            slug: post.slug,
            date: post.date,
            excerpt: post.excerpt,
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
      } catch (error) {
        console.error("Failed to add bookmark:", error)
        toast({
          title: "Error",
          description: "Failed to bookmark article",
          variant: "destructive",
        })
      }
    },
    [user, toast],
  )

  const removeBookmark = useCallback(
    async (postId: string) => {
      if (!user) return

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
      } catch (error) {
        console.error("Failed to remove bookmark:", error)
        toast({
          title: "Error",
          description: "Failed to remove bookmark",
          variant: "destructive",
        })
      }
    },
    [user, toast],
  )

  const isBookmarked = useCallback((postId: string) => bookmarks.some((b) => b.post_id === postId), [bookmarks])

  const contextValue = useMemo(
    () => ({
      bookmarks,
      loading,
      addBookmark,
      removeBookmark,
      isBookmarked,
    }),
    [bookmarks, loading, addBookmark, removeBookmark, isBookmarked],
  )

  return <BookmarksContext.Provider value={contextValue}>{children}</BookmarksContext.Provider>
}
