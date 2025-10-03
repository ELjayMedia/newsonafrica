"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/supabase"

interface Bookmark {
  id: string
  user_id: string
  post_id: string
  country?: string
  title: string
  slug?: string
  excerpt?: string
  created_at: string
  featured_image?: any
  category?: string
  tags?: string[]
  read_status?: "unread" | "read"
  notes?: string
}

interface BookmarkStats {
  total: number
  unread: number
  categories: Record<string, number>
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
  exportBookmarks: () => Promise<string>
  isLoading: boolean
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined)

type SupabaseBookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]

type BookmarkHydrationMap = Record<
  string,
  {
    id: string
    country?: string
    slug?: string
    title?: string
    excerpt?: string
    featured_image?: Bookmark["featured_image"]
  }
>

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()
const BOOKMARK_SYNC_QUEUE = "bookmarks-write-queue"

const isOfflineError = (error: unknown) => {
  if (typeof navigator === "undefined") return false
  if (!navigator.onLine) return true
  if (error instanceof TypeError && error.message?.includes("Failed to fetch")) {
    return true
  }
  return false
}

const readJson = async <T = any>(response: Response): Promise<T | null> => {
  try {
    const text = await response.text()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

const extractText = (value: unknown): string => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && "rendered" in (value as Record<string, unknown>)) {
    const rendered = (value as { rendered?: unknown }).rendered
    return typeof rendered === "string" ? rendered : ""
  }
  return ""
}

const extractFeaturedImage = (value: unknown): Bookmark["featured_image"] => {
  if (!value) return null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return extractFeaturedImage(parsed)
    } catch {
      return null
    }
  }
  if (typeof value !== "object" || value === null) return null
  const obj = value as Record<string, any>
  if (obj.node) {
    return extractFeaturedImage(obj.node)
  }

  const url =
    obj.url ||
    obj.sourceUrl ||
    obj.source_url ||
    obj.media_details?.source_url ||
    obj.guid?.rendered
  const width = obj.width || obj.mediaDetails?.width || obj.media_details?.width
  const height = obj.height || obj.mediaDetails?.height || obj.media_details?.height

  if (!url && !width && !height) {
    return null
  }

  return {
    url: url || undefined,
    width: typeof width === "number" ? width : undefined,
    height: typeof height === "number" ? height : undefined,
  }
}

const formatBookmarkRow = (
  row: SupabaseBookmarkRow,
  metadata?: BookmarkHydrationMap[string],
): Bookmark => {
  const metaTitle = metadata?.title ? extractText(metadata.title) : ""
  const metaExcerpt = metadata?.excerpt ? extractText(metadata.excerpt) : ""
  const title = extractText(row.title) || metaTitle || "Untitled Post"
  const slug = row.slug || metadata?.slug || ""
  const excerpt = extractText(row.excerpt) || metaExcerpt || ""
  const featured_image =
    extractFeaturedImage(row.featured_image) || extractFeaturedImage(metadata?.featured_image) || null

  const readStatus = row.read_status === "read" || row.read_status === "unread" ? row.read_status : undefined

  return {
    id: row.id,
    user_id: row.user_id,
    post_id: row.post_id,
    country: row.country || metadata?.country || undefined,
    title,
    slug: slug || undefined,
    excerpt: excerpt || undefined,
    created_at: row.created_at,
    featured_image,
    category: row.category || undefined,
    tags: row.tags || undefined,
    read_status: readStatus,
    notes: row.notes || undefined,
  }
}

const buildHydrationPayload = (bookmarks: SupabaseBookmarkRow[]) => {
  const grouped = new Map<string, Set<string>>()

  bookmarks.forEach((bookmark) => {
    const country = (bookmark.country || DEFAULT_COUNTRY).toLowerCase()
    if (!grouped.has(country)) {
      grouped.set(country, new Set())
    }
    grouped.get(country)!.add(bookmark.post_id)
  })

  return Array.from(grouped.entries()).map(([country, ids]) => ({
    country,
    postIds: Array.from(ids),
  }))
}

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
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const cacheRef = useRef<Map<string, Bookmark>>(new Map())

  // Calculate stats
  const stats = useMemo((): BookmarkStats => {
    const total = bookmarks.length
    const unread = bookmarks.filter((b) => b.read_status !== "read").length
    const categories: Record<string, number> = {}

    bookmarks.forEach((bookmark) => {
      if (bookmark.category) {
        categories[bookmark.category] = (categories[bookmark.category] || 0) + 1
      }
    })

    return { total, unread, categories }
  }, [bookmarks])

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

  const fetchBookmarks = useCallback(async () => {
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

      const fetched = (data || []) as SupabaseBookmarkRow[]
      const hydrationPayload = buildHydrationPayload(fetched)

      let hydrationMap: BookmarkHydrationMap = {}
      if (hydrationPayload.length > 0) {
        try {
          const res = await fetch("/api/bookmarks/hydrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(hydrationPayload),
          })
          if (res.ok) {
            const json = (await res.json()) as { posts?: BookmarkHydrationMap }
            hydrationMap = json.posts || {}
          } else {
            console.error("Failed to hydrate bookmarks: HTTP", res.status)
          }
        } catch (err) {
          console.error("Failed to hydrate bookmarks", err)
        }
      }

      const hydrated = fetched.map((row) =>
        formatBookmarkRow(row, hydrationMap[row.post_id]),
      )
      setBookmarks(hydrated)
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
  }, [supabase, toast, user])

  // Fetch bookmarks when user changes
  useEffect(() => {
    if (user) {
      fetchBookmarks()
    } else {
      setBookmarks([])
      setLoading(false)
    }
  }, [fetchBookmarks, user])

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
        const postData = post as any
        const insertPayload = {
          user_id: user.id,
          post_id: post.post_id,
          country: post.country || null,
          title: extractText(postData.title) || "Untitled Post",
          slug: typeof postData.slug === "string" ? postData.slug : "",
          excerpt: extractText(postData.excerpt),
          featured_image:
            extractFeaturedImage(postData.featured_image || postData.featuredImage) || null,
          category: post.category || null,
          tags: post.tags || null,
          read_status: "unread" as const,
          notes: post.notes || null,
        }
        let response: Response
        try {
          response = await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              postId: insertPayload.post_id,
              title: insertPayload.title,
              slug: insertPayload.slug,
              excerpt: insertPayload.excerpt,
              featuredImage: insertPayload.featured_image,
              category: insertPayload.category,
              tags: insertPayload.tags,
              notes: insertPayload.notes,
              country: insertPayload.country,
            }),
          })
        } catch (error) {
          if (isOfflineError(error)) {
            console.warn("Bookmark request queued for background sync", error)
            return
          }
          throw error
        }

        const result = await readJson<{ bookmark?: SupabaseBookmarkRow; error?: string }>(response)

        if (!response.ok || !result?.bookmark) {
          const message = result?.error || `Failed to add bookmark (HTTP ${response.status})`
          throw new Error(message)
        }

        setBookmarks((prev) => [formatBookmarkRow(result.bookmark as SupabaseBookmarkRow), ...prev])
      } catch (error: any) {
        if (isOfflineError(error)) {
          console.warn("Bookmark add operation queued due to offline mode", error)
          return
        }
        console.error("Error adding bookmark:", error)
        toast({
          title: "Bookmark failed",
          description: error?.message || "Failed to add bookmark.",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isBookmarked, toast, user],
  )

  const removeBookmark = useCallback(
    async (postId: string) => {
      if (!user || !postId) return

      setIsLoading(true)
      try {
        let response: Response
        try {
          const params = new URLSearchParams({ postId })
          response = await fetch(`/api/bookmarks?${params.toString()}`, {
            method: "DELETE",
          })
        } catch (error) {
          if (isOfflineError(error)) {
            console.warn("Bookmark delete queued for background sync", error)
            return
          }
          throw error
        }

        const result = await readJson<{ success?: boolean; error?: string }>(response)
        if (!response.ok || result?.success === false) {
          const message = result?.error || `Failed to remove bookmark (HTTP ${response.status})`
          throw new Error(message)
        }

        setBookmarks((prev) => prev.filter((b) => b.post_id !== postId))
      } catch (error: any) {
        if (isOfflineError(error)) {
          console.warn("Bookmark delete operation queued due to offline mode", error)
          return
        }
        console.error("Error removing bookmark:", error)
        toast({
          title: "Bookmark removal failed",
          description: error?.message || "Failed to remove bookmark.",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [toast, user],
  )

  const updateBookmark = useCallback(
    async (postId: string, updates: Partial<Bookmark>) => {
      if (!user) return

      setIsLoading(true)
      try {
        const sanitizedUpdates = { ...updates }
        if ("featured_image" in sanitizedUpdates) {
          sanitizedUpdates.featured_image =
            sanitizedUpdates.featured_image && typeof sanitizedUpdates.featured_image === "object"
              ? sanitizedUpdates.featured_image
              : null
        }

        let response: Response
        try {
          response = await fetch("/api/bookmarks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId, updates: sanitizedUpdates }),
          })
        } catch (error) {
          if (isOfflineError(error)) {
            console.warn("Bookmark update queued for background sync", error)
            return
          }
          throw error
        }

        const result = await readJson<{ bookmark?: SupabaseBookmarkRow; error?: string }>(response)
        if (!response.ok || !result?.bookmark) {
          const message = result?.error || `Failed to update bookmark (HTTP ${response.status})`
          throw new Error(message)
        }

        setBookmarks((prev) =>
          prev.map((b) => (b.post_id === postId ? formatBookmarkRow(result.bookmark as SupabaseBookmarkRow) : b)),
        )
      } catch (error: any) {
        if (isOfflineError(error)) {
          console.warn("Bookmark update queued due to offline mode", error)
          return
        }
        console.error("Error updating bookmark:", error)
        toast({
          title: "Bookmark update failed",
          description: error?.message || "Failed to update bookmark.",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [toast, user],
  )

  const bulkRemoveBookmarks = useCallback(
    async (postIds: string[]) => {
      if (!user || postIds.length === 0) return

      setIsLoading(true)
      try {
        let response: Response
        try {
          const params = new URLSearchParams({ postIds: postIds.join(",") })
          response = await fetch(`/api/bookmarks?${params.toString()}`, {
            method: "DELETE",
          })
        } catch (error) {
          if (isOfflineError(error)) {
            console.warn("Bulk bookmark removal queued for background sync", error)
            return
          }
          throw error
        }

        const result = await readJson<{ success?: boolean; error?: string }>(response)
        if (!response.ok || result?.success === false) {
          const message = result?.error || `Failed to remove bookmarks (HTTP ${response.status})`
          throw new Error(message)
        }

        setBookmarks((prev) => prev.filter((b) => !postIds.includes(b.post_id)))

        toast({
          title: "Bookmarks removed",
          description: `${postIds.length} bookmarks removed successfully`,
        })
      } catch (error: any) {
        if (isOfflineError(error)) {
          console.warn("Bulk bookmark removal queued due to offline mode", error)
          return
        }
        toast({
          title: "Error",
          description: `Failed to remove bookmarks: ${error.message}`,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, user],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; queue?: string; error?: string } | null
      if (!data || typeof data !== "object") return
      if (data.queue !== BOOKMARK_SYNC_QUEUE) return

      switch (data.type) {
        case "BACKGROUND_SYNC_ENQUEUE":
          toast({
            title: "Bookmark queued",
            description: "We'll sync your bookmark once you're back online.",
          })
          break
        case "BACKGROUND_SYNC_QUEUE_REPLAYED":
          toast({
            title: "Bookmarks synced",
            description: "Your offline bookmark changes have been saved.",
          })
          fetchBookmarks()
          break
        case "BACKGROUND_SYNC_QUEUE_ERROR":
          toast({
            title: "Sync failed",
            description: data.error || "We couldn't sync your bookmark changes.",
            variant: "destructive",
          })
          break
        default:
          break
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage)
  }, [fetchBookmarks, toast])

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
  }, [user])

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
      exportBookmarks,
      isLoading,
    ],
  )

  return <BookmarksContext.Provider value={contextValue}>{children}</BookmarksContext.Provider>
}
