"use client"

import type React from "react"
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useTransition,
} from "react"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import {
  addBookmark as addBookmarkAction,
  bulkRemoveBookmarks as bulkRemoveBookmarksAction,
  exportBookmarks as exportBookmarksAction,
  listBookmarks as listBookmarksAction,
  markRead as markReadAction,
  markUnread as markUnreadAction,
  removeBookmark as removeBookmarkAction,
  updateBookmark as updateBookmarkAction,
  type AddBookmarkInput,
  type UpdateBookmarkInput,
} from "@/app/actions/bookmarks"
import type {
  BookmarkListPayload,
  BookmarkListRow,
  BookmarkPagination,
  BookmarkStats,
} from "@/types/bookmarks"
import { ensureActionError } from "@/lib/supabase/action-result"

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

interface BookmarksContextType {
  bookmarks: Bookmark[]
  loading: boolean
  stats: BookmarkStats
  pagination: BookmarkPagination
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
const DEFAULT_STATS: BookmarkStats = { total: 0, unread: 0, categories: {} }
const DEFAULT_PAGINATION: BookmarkPagination = {
  page: 1,
  limit: 0,
  hasMore: false,
  nextPage: null,
  nextCursor: null,
}

const deriveStatsFromBookmarks = (items: Bookmark[]): BookmarkStats => {
  const categories: Record<string, number> = {}
  let unread = 0

  for (const bookmark of items) {
    if (bookmark.category) {
      categories[bookmark.category] = (categories[bookmark.category] || 0) + 1
    }

    if (bookmark.read_status !== "read") {
      unread += 1
    }
  }

  return {
    total: items.length,
    unread,
    categories,
  }
}

const isOfflineError = (error: unknown) => {
  if (typeof navigator === "undefined") return false
  if (!navigator.onLine) return true
  if (error instanceof TypeError && error.message?.includes("Failed to fetch")) {
    return true
  }
  return false
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
  row: BookmarkListRow,
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

const buildHydrationPayload = (bookmarks: BookmarkListRow[]) => {
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

type BookmarkActionResult = Awaited<ReturnType<typeof addBookmarkAction>>

interface MutationOptions {
  offlineMessage?: string
  errorTitle?: string
  errorMessage?: string
  onSuccess?: () => void
  optimisticUpdate?: () => void | (() => void)
}

export function useBookmarks() {
  const context = useContext(BookmarksContext)
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider")
  }
  return context
}

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { user, ensureSessionFreshness } = useUser()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [stats, setStats] = useState<BookmarkStats>(DEFAULT_STATS)
  const [pagination, setPagination] = useState<BookmarkPagination>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const cacheRef = useRef<Map<string, Bookmark>>(new Map())
  const bookmarksRef = useRef<Bookmark[]>([])
  const statsRef = useRef<BookmarkStats>(DEFAULT_STATS)
  const mutationQueueRef = useRef<(() => Promise<void>)[]>([])
  const processingQueueRef = useRef(false)
  const [, startTransition] = useTransition()

  // Update cache when bookmarks change
  useEffect(() => {
    cacheRef.current.clear()
    bookmarks.forEach((bookmark) => {
      cacheRef.current.set(bookmark.post_id, bookmark)
    })
  }, [bookmarks])

  useEffect(() => {
    bookmarksRef.current = bookmarks
  }, [bookmarks])

  useEffect(() => {
    statsRef.current = stats
  }, [stats])

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

  const hydrateBookmarks = useCallback(async (rows: BookmarkListRow[]): Promise<BookmarkHydrationMap> => {
    if (rows.length === 0) {
      return {}
    }

    const hydrationPayload = buildHydrationPayload(rows)

    if (hydrationPayload.length === 0) {
      return {}
    }

    try {
      const res = await fetch("/api/bookmarks/hydrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hydrationPayload),
      })

      if (!res.ok) {
        console.error("Failed to hydrate bookmarks: HTTP", res.status)
        return {}
      }

      const json = (await res.json()) as { posts?: BookmarkHydrationMap }
      return json.posts || {}
    } catch (error) {
      console.error("Failed to hydrate bookmarks", error)
      return {}
    }
  }, [])

  const applyServerPayload = useCallback(
    async (payload: BookmarkListPayload) => {
      const hydrationMap = await hydrateBookmarks(payload.bookmarks)
      const hydrated = payload.bookmarks.map((row) =>
        formatBookmarkRow(row, hydrationMap[row.post_id]),
      )

      setBookmarks(hydrated)
      setStats(payload.stats ?? DEFAULT_STATS)
      setPagination(payload.pagination ?? DEFAULT_PAGINATION)
    },
    [hydrateBookmarks],
  )

  const processMutationQueue = useCallback(() => {
    if (processingQueueRef.current) return

    const runNext = async (): Promise<void> => {
      const nextTask = mutationQueueRef.current.shift()
      if (!nextTask) {
        processingQueueRef.current = false
        return
      }

      try {
        await nextTask()
      } catch (error) {
        if (isOfflineError(error)) {
          mutationQueueRef.current.unshift(nextTask)
          processingQueueRef.current = false
          return
        }

        console.error("Bookmark mutation failed:", error)
      }

      await runNext()
    }

    processingQueueRef.current = true
    startTransition(() => {
      void runNext()
    })
  }, [startTransition])

  const enqueueMutation = useCallback(
    (task: () => Promise<void>) => {
      mutationQueueRef.current.push(task)
      processMutationQueue()
    },
    [processMutationQueue],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      processMutationQueue()
    }

    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("online", handleOnline)
    }
  }, [processMutationQueue])

  const executeMutation = useCallback(
    (action: () => Promise<BookmarkActionResult>, options: MutationOptions = {}) => {
      let resolveTask: () => void = () => {}
      let rejectTask: (error: unknown) => void = () => {}

      const taskPromise = new Promise<void>((resolve, reject) => {
        resolveTask = resolve
        rejectTask = reject
      })

      const task = async () => {
        let rollback: (() => void) | undefined

        if (options.optimisticUpdate) {
          rollback = options.optimisticUpdate()
        }

        setIsLoading(true)
        try {
          await ensureSessionFreshness()
          const result = await action()

          if (result?.error) {
            throw result.error
          }

          if (result?.data) {
            await applyServerPayload(result.data as BookmarkListPayload)
          }

          options.onSuccess?.()
          resolveTask()
        } catch (error) {
          if (isOfflineError(error)) {
            toast({
              title: "Offline",
              description:
                options.offlineMessage || "We'll sync your bookmark once you're back online.",
            })
            resolveTask()
            throw error
          }

          if (rollback) {
            rollback()
          }

          const actionError = ensureActionError(
            error,
            options.errorMessage || "Failed to update bookmarks.",
          )

          toast({
            title: options.errorTitle || "Bookmark error",
            description: actionError.message,
            variant: "destructive",
          })

          rejectTask(actionError)
          throw actionError
        } finally {
          setIsLoading(false)
        }
      }

      enqueueMutation(task)
      return taskPromise
    },
    [applyServerPayload, enqueueMutation, ensureSessionFreshness, toast],
  )

  const fetchBookmarks = useCallback(
    async (options?: { revalidate?: boolean }) => {
      try {
        setLoading(true)

        if (!user) {
          setBookmarks([])
          setStats(DEFAULT_STATS)
          setPagination(DEFAULT_PAGINATION)
          return
        }

        await ensureSessionFreshness()
        const result = await listBookmarksAction({ revalidate: options?.revalidate })

        if (result.error) {
          throw result.error
        }

        if (result.data) {
          await applyServerPayload(result.data)
        }
      } catch (error) {
        if (isOfflineError(error)) {
          console.warn("Failed to fetch bookmarks due to offline mode", error)
          toast({
            title: "Offline",
            description: "Bookmarks will sync once you're back online.",
          })
        } else {
          const actionError = ensureActionError(error, "Failed to load bookmarks")
          console.error("Error fetching bookmarks:", actionError)
          toast({
            title: "Error",
            description: actionError.message,
            variant: "destructive",
          })
        }
      } finally {
        setLoading(false)
      }
    },
    [applyServerPayload, ensureSessionFreshness, toast, user],
  )

  // Fetch bookmarks when user changes
  useEffect(() => {
    if (!user) {
      setBookmarks([])
      setStats(DEFAULT_STATS)
      setPagination(DEFAULT_PAGINATION)
      setLoading(false)
      return
    }

    startTransition(() => {
      void fetchBookmarks()
    })
  }, [fetchBookmarks, startTransition, user])

  const addBookmark = useCallback(
    async (post: Omit<Bookmark, "id" | "user_id" | "created_at">) => {
      if (!user) {
        throw new Error("User not authenticated")
      }

      if (isBookmarked(post.post_id)) {
        return
      }

      const postData = post as any
      const payload: AddBookmarkInput = {
        postId: post.post_id,
        country: post.country || null,
        title: extractText(postData.title) || "Untitled Post",
        slug: typeof postData.slug === "string" ? postData.slug : "",
        excerpt: extractText(postData.excerpt),
        featuredImage:
          extractFeaturedImage(postData.featured_image || postData.featuredImage) || null,
        category: post.category || null,
        tags: post.tags || null,
        notes: post.notes || null,
      }

      const optimisticBookmark: Bookmark = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        post_id: post.post_id,
        country: post.country || undefined,
        title: payload.title || "Untitled Post",
        slug: payload.slug || undefined,
        excerpt: payload.excerpt || undefined,
        created_at: new Date().toISOString(),
        featured_image: payload.featuredImage || null,
        category: post.category || undefined,
        tags: post.tags || undefined,
        read_status: "unread",
        notes: post.notes || undefined,
      }

      return executeMutation(() => addBookmarkAction(payload), {
        offlineMessage: "We'll sync your bookmark once you're back online.",
        errorTitle: "Bookmark failed",
        errorMessage: "Failed to add bookmark.",
        optimisticUpdate: () => {
          const previousBookmarks = bookmarksRef.current
          const previousStats = statsRef.current

          const nextBookmarks = [optimisticBookmark, ...previousBookmarks]
          setBookmarks(nextBookmarks)
          setStats(deriveStatsFromBookmarks(nextBookmarks))

          return () => {
            setBookmarks(previousBookmarks)
            setStats(previousStats)
          }
        },
      })
    },
    [executeMutation, isBookmarked, user],
  )

  const removeBookmark = useCallback(
    async (postId: string) => {
      if (!user || !postId) return

      const optimisticUpdate = () => {
        const previousBookmarks = bookmarksRef.current
        const previousStats = statsRef.current

        const nextBookmarks = previousBookmarks.filter((b) => b.post_id !== postId)
        setBookmarks(nextBookmarks)
        setStats(deriveStatsFromBookmarks(nextBookmarks))

        return () => {
          setBookmarks(previousBookmarks)
          setStats(previousStats)
        }
      }

      return executeMutation(() => removeBookmarkAction(postId), {
        offlineMessage: "We'll remove this bookmark when you're back online.",
        errorTitle: "Bookmark removal failed",
        errorMessage: "Failed to remove bookmark.",
        optimisticUpdate,
      })
    },
    [executeMutation, user],
  )

  const updateBookmark = useCallback(
    async (postId: string, updates: Partial<Bookmark>) => {
      if (!user || !postId) return

      const sanitized: UpdateBookmarkInput["updates"] = {}

      if (Object.prototype.hasOwnProperty.call(updates, "country")) {
        sanitized.country = updates.country ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "title")) {
        sanitized.title = updates.title ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "slug")) {
        sanitized.slug = updates.slug ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "excerpt")) {
        sanitized.excerpt = updates.excerpt ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "category")) {
        sanitized.category = updates.category ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "tags")) {
        sanitized.tags = updates.tags ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "read_status")) {
        sanitized.read_status = updates.read_status ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "notes")) {
        sanitized.notes = updates.notes ?? null
      }
      if (Object.prototype.hasOwnProperty.call(updates, "featured_image")) {
        const value = updates.featured_image
        sanitized.featured_image = value && typeof value === "object" ? value : null
      }

      return executeMutation(
        () => updateBookmarkAction({ postId, updates: sanitized }),
        {
          offlineMessage: "We'll update this bookmark when you're back online.",
          errorTitle: "Bookmark update failed",
          errorMessage: "Failed to update bookmark.",
          optimisticUpdate: () => {
            const previousBookmarks = bookmarksRef.current
            const previousStats = statsRef.current

            const nextBookmarks = previousBookmarks.map((bookmark) =>
              bookmark.post_id === postId ? { ...bookmark, ...updates } : bookmark,
            )

            setBookmarks(nextBookmarks)
            setStats(deriveStatsFromBookmarks(nextBookmarks))

            return () => {
              setBookmarks(previousBookmarks)
              setStats(previousStats)
            }
          },
        },
      )
    },
    [executeMutation, user],
  )

  const bulkRemoveBookmarks = useCallback(
    async (postIds: string[]) => {
      if (!user || postIds.length === 0) return

      return executeMutation(
        () => bulkRemoveBookmarksAction({ postIds }),
        {
          offlineMessage: "We'll remove these bookmarks when you're back online.",
          errorTitle: "Bulk removal failed",
          errorMessage: "Failed to remove bookmarks.",
          onSuccess: () => {
            toast({
              title: "Bookmarks removed",
              description: `${postIds.length} bookmarks removed successfully`,
            })
          },
          optimisticUpdate: () => {
            const previousBookmarks = bookmarksRef.current
            const previousStats = statsRef.current

            const nextBookmarks = previousBookmarks.filter((bookmark) => !postIds.includes(bookmark.post_id))
            setBookmarks(nextBookmarks)
            setStats(deriveStatsFromBookmarks(nextBookmarks))

            return () => {
              setBookmarks(previousBookmarks)
              setStats(previousStats)
            }
          },
        },
      )
    },
    [executeMutation, toast, user],
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
          fetchBookmarks({ revalidate: true })
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
      if (!user || !postId) return

      return executeMutation(() => markReadAction(postId), {
        offlineMessage: "We'll mark this bookmark as read when you're back online.",
        errorTitle: "Bookmark update failed",
        errorMessage: "Failed to mark bookmark as read.",
        optimisticUpdate: () => {
          const previousBookmarks = bookmarksRef.current
          const previousStats = statsRef.current

          const nextBookmarks = previousBookmarks.map((bookmark) =>
            bookmark.post_id === postId ? { ...bookmark, read_status: "read" as const } : bookmark,
          )

          setBookmarks(nextBookmarks)
          setStats(deriveStatsFromBookmarks(nextBookmarks))

          return () => {
            setBookmarks(previousBookmarks)
            setStats(previousStats)
          }
        },
      })
    },
    [executeMutation, user],
  )

  const markAsUnread = useCallback(
    async (postId: string) => {
      if (!user || !postId) return

      return executeMutation(() => markUnreadAction(postId), {
        offlineMessage: "We'll mark this bookmark as unread when you're back online.",
        errorTitle: "Bookmark update failed",
        errorMessage: "Failed to mark bookmark as unread.",
        optimisticUpdate: () => {
          const previousBookmarks = bookmarksRef.current
          const previousStats = statsRef.current

          const nextBookmarks = previousBookmarks.map((bookmark) =>
            bookmark.post_id === postId ? { ...bookmark, read_status: "unread" as const } : bookmark,
          )

          setBookmarks(nextBookmarks)
          setStats(deriveStatsFromBookmarks(nextBookmarks))

          return () => {
            setBookmarks(previousBookmarks)
            setStats(previousStats)
          }
        },
      })
    },
    [executeMutation, user],
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
    try {
      await ensureSessionFreshness()
      const result = await exportBookmarksAction()

      if (result.error || !result.data) {
        throw result.error || new Error("Failed to export bookmarks")
      }

      return result.data
    } catch (error) {
      if (isOfflineError(error)) {
        const message = "Bookmark export is unavailable while offline."
        toast({ title: "Offline", description: message })
        throw new Error(message)
      }

      const actionError = ensureActionError(error, "Failed to export bookmarks.")
      toast({
        title: "Export failed",
        description: actionError.message,
        variant: "destructive",
      })
      throw actionError
    }
  }, [ensureSessionFreshness, toast])

  const refreshBookmarks = useCallback(async () => {
    await fetchBookmarks({ revalidate: true })
  }, [fetchBookmarks])

  const contextValue = useMemo(
    () => ({
      bookmarks,
      loading,
      stats,
      pagination,
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
      pagination,
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
