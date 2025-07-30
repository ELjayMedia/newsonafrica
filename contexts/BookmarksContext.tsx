"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { fetchSinglePost } from "@/lib/wordpress"

import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/utils/supabase/client"
import { getBookmarkStats, type BookmarkStats } from "@/utils/supabase/bookmark-stats"
import { useToast } from "@/hooks/use-toast"


export interface Bookmark {
  id: string
  user_id: string
  post_id: string
  title: string
  slug?: string
  excerpt?: string
  created_at: string
  featuredImage?: any
  category?: string
  tags?: string[]
  read_status?: "unread" | "read"
  notes?: string
}


interface BookmarksContextType {
  bookmarks: Bookmark[]
  loading: boolean
  stats: BookmarkStats
  addBookmark: (post: Omit<Bookmark, "id" | "user_id" | "created_at">) => Promise<void>
  removeBookmark: (postId: string) => Promise<void>
  toggleBookmark: (post: Omit<Bookmark, "id" | "user_id" | "created_at">) => Promise<void>
  updateBookmark: (postId: string, updates: Partial<Bookmark>) => Promise<void>
  bulkRemoveBookmarks: (postIds: string[]) => Promise<void>
  markAsRead: (postId: string) => Promise<void>
  markAsUnread: (postId: string) => Promise<void>
  addNote: (postId: string, note: string) => Promise<void>
  isBookmarked: (postId: string) => boolean
  getBookmark: (postId: string) => Bookmark | undefined
  searchBookmarks: (query: string) => Bookmark[]
  filterByCategory: (category: string) => Bookmark[]
  refreshBookmarks: () => Promise<void>
  refreshBookmark: (postId: string) => Promise<void>
  exportBookmarks: () => Promise<string>
  isLoading: boolean
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
  initialBookmarks?: Bookmark[]
  initialStats?: BookmarkStats
}

export function BookmarksProvider({
  children,

  initialBookmarks,
  initialStats, // currently unused but accepted for future flexibility
}: BookmarksProviderProps) {
  const { user } = useUser()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks ?? [])
  const [loading, setLoading] = useState(initialBookmarks ? false : true)

  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const cacheRef = useRef<Map<string, Bookmark>>(new Map())
  const initialDataLoadedRef = useRef(false)



  // Stats returned from Supabase RPC
  const [stats, setStats] = useState<BookmarkStats>({ total: 0, unread: 0, categories: {} })

  const fetchBookmarkStats = useCallback(async () => {
    if (!user) return
    try {
      const data = await getBookmarkStats(user.id)
      setStats(data)
    } catch (error) {
      console.error('Error fetching bookmark stats:', error)
    }
  }, [user])



  // Update cache when bookmarks change
  useEffect(() => {
    cacheRef.current.clear()
    bookmarks.forEach((bookmark) => {
      cacheRef.current.set(bookmark.post_id, bookmark)
    })
  }, [bookmarks])

  const isBookmarked = useCallback(
    (postId: string) => {
      if (!postId) return false
      return cacheRef.current.has(postId)
    },
    [bookmarks], // Keep dependency for reactivity
  )

  const getBookmark = useCallback(
    (postId: string) => {
      return cacheRef.current.get(postId)
    },
    [bookmarks], // Keep dependency for reactivity
  )

  // Fetch bookmarks and stats when user changes
  useEffect(() => {
    if (user) {

      fetchBookmarks()
      fetchBookmarkStats()

    } else {
      setBookmarks([])
      setStats({ total: 0, unread: 0, categories: {} })
      setLoading(false)
    }
  }, [user, fetchBookmarkStats])

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
      await fetchBookmarkStats()

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
        throw new Error("User not authenticated")
      }

      if (isBookmarked(post.post_id)) {
        return // Already bookmarked
      }

      setIsLoading(true)
      try {
        const bookmarkData = {
          user_id: user.id,
          post_id: post.post_id,
          title: post.title || "Untitled Post",
          slug: post.slug || "",
          excerpt: post.excerpt || "",
          featuredImage: post.featuredImage || null,
          category: post.category || null,
          tags: post.tags || null,
          read_status: "unread" as const,
          notes: post.notes || null,
        }

        const { data, error } = await supabase.from("bookmarks").insert(bookmarkData).select().single()

        if (error) {
          throw error
        }

        setBookmarks((prev) => [data, ...prev])

        await fetchBookmarkStats()

      } finally {
        setIsLoading(false)
      }
    },
    [user, supabase, isBookmarked, refreshStats],
  )

  const removeBookmark = useCallback(
    async (postId: string) => {
      if (!user || !postId) return

      setIsLoading(true)
      try {
        const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId)

        if (error) {
          throw error
        }

        setBookmarks((prev) => prev.filter((b) => b.post_id !== postId))

        await fetchBookmarkStats()

      } finally {
        setIsLoading(false)
      }
    },
    [user, supabase, refreshStats],
  )

  const updateBookmark = useCallback(
    async (postId: string, updates: Partial<Bookmark>) => {
      if (!user) return

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("bookmarks")
          .update(updates)
          .eq("user_id", user.id)
          .eq("post_id", postId)
          .select()
          .single()

        if (error) {
          throw error
        }


        setBookmarks((prev) => prev.map((b) => (b.post_id === postId ? { ...b, ...data } : b)))
        await fetchBookmarkStats()

      } finally {
        setIsLoading(false)
      }
    },
    [user, supabase, refreshStats],
  )

  const bulkRemoveBookmarks = useCallback(
    async (postIds: string[]) => {
      if (!user || postIds.length === 0) return

      setIsLoading(true)
      try {
        const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).in("post_id", postIds)

        if (error) {
          throw error
        }

        setBookmarks((prev) => prev.filter((b) => !postIds.includes(b.post_id)))

        await fetchBookmarkStats()


        toast({
          title: "Bookmarks removed",
          description: `${postIds.length} bookmarks removed successfully`,
        })
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to remove bookmarks: ${error.message}`,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [user, supabase, toast, refreshStats],
  )

  const markAsRead = useCallback(
    async (postId: string) => {
      await updateBookmark(postId, { read_status: "read" })
    },
    [updateBookmark],
  )

  const markAsUnread = useCallback(
    async (postId: string) => {
      await updateBookmark(postId, { read_status: "unread" })
    },
    [updateBookmark],
  )

  const addNote = useCallback(
    async (postId: string, note: string) => {
      await updateBookmark(postId, { notes: note })
    },
    [updateBookmark],
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

  const searchBookmarks = useCallback(
    (query: string): Bookmark[] => {
      if (!query.trim()) return bookmarks

      const searchTerm = query.toLowerCase()
      return bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(searchTerm) ||
          bookmark.excerpt?.toLowerCase().includes(searchTerm) ||
          bookmark.notes?.toLowerCase().includes(searchTerm) ||
          bookmark.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)),
      )
    },
    [bookmarks],
  )

  const filterByCategory = useCallback(
    (category: string): Bookmark[] => {
      return bookmarks.filter((bookmark) => bookmark.category === category)
    },
    [bookmarks],
  )

  const exportBookmarks = useCallback(async (): Promise<string> => {
    const exportData = {
      exported_at: new Date().toISOString(),
      total_bookmarks: bookmarks.length,
      bookmarks: bookmarks.map((bookmark) => ({
        title: bookmark.title,
        slug: bookmark.slug,
        excerpt: bookmark.excerpt,
        created_at: bookmark.created_at,
        category: bookmark.category,
        tags: bookmark.tags,
        read_status: bookmark.read_status,
        notes: bookmark.notes,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  }, [bookmarks])

  const refreshBookmarks = useCallback(async () => {
    await fetchBookmarks()
    await refreshStats()
  }, [user, refreshStats])

  const refreshBookmark = useCallback(
    async (postId: string) => {
      if (!user) return

      const existing = getBookmark(postId)
      if (!existing) return

      setIsLoading(true)
      try {
        const post = await fetchSinglePost(existing.slug || postId)

        if (!post) return

        const updates = {
          title: post.title || existing.title,
          slug: post.slug || existing.slug,
          excerpt: post.excerpt || existing.excerpt,
          featuredImage: post.featuredImage
            ? JSON.stringify(post.featuredImage)
            : null,
        }

        const { data, error } = await supabase
          .from("bookmarks")
          .update(updates)
          .eq("user_id", user.id)
          .eq("post_id", postId)
          .select()
          .single()

        if (error) {
          throw error
        }

        if (data) {
          setBookmarks((prev) =>
            prev.map((b) => (b.post_id === postId ? { ...b, ...data } : b)),
          )
        }
      } catch (error: any) {
        console.error("Error refreshing bookmark:", error)
        toast({
          title: "Error",
          description: `Failed to refresh bookmark: ${error.message}`,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [user, supabase, getBookmark, toast],
  )

  const contextValue = useMemo(
    () => ({
      bookmarks,
      loading,
      stats,
      addBookmark,
      removeBookmark,
      toggleBookmark,
      updateBookmark,
      bulkRemoveBookmarks,
      markAsRead,
      markAsUnread,
      addNote,
      isBookmarked,
      getBookmark,
      searchBookmarks,
      filterByCategory,
      refreshBookmarks,
      refreshBookmark,
      exportBookmarks,
      isLoading,
    }),
    [
      bookmarks,
      loading,
      stats,
      addBookmark,
      removeBookmark,
      toggleBookmark,
      updateBookmark,
      bulkRemoveBookmarks,
      markAsRead,
      markAsUnread,
      addNote,
      isBookmarked,
      getBookmark,
      searchBookmarks,
      filterByCategory,
      refreshBookmarks,
      refreshBookmark,
      exportBookmarks,
      isLoading,
    ],
  )

  return <BookmarksContext.Provider value={contextValue}>{children}</BookmarksContext.Provider>
}
