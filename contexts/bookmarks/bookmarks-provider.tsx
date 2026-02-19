"use client"

import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  BookmarkApiPayload,
  BookmarkDomainModel,
  BookmarkListPayload,
  BookmarkMutationPayload,
  BookmarkPagination,
  BookmarkStats,
} from "@/types/bookmarks"
import { ensureActionError } from "@/lib/supabase/action-result"
import {
  buildHydrationPayload,
  apiPayloadToDomainBookmarkDraft,
  extractFeaturedImage,
  extractText,
  formatBookmarkRow,
  getRowPostId,
  type Bookmark,
} from "./bookmarks-mappers"
import {
  applyStatsDelta,
  DEFAULT_STATS,
  deriveStatsFromBookmarks,
  EMPTY_STATS_DELTA,
  hasStatsDelta,
} from "./bookmarks-store"
import {
  BOOKMARK_SYNC_QUEUE,
  createBookmarkHydrator,
  createMutationQueue,
  isOfflineError,
} from "./bookmarks-sync"

interface BookmarksContextType {
  bookmarks: Bookmark[]
  loading: boolean
  stats: BookmarkStats
  pagination: BookmarkPagination
  addBookmark: (post: BookmarkApiPayload) => Promise<void>
  removeBookmark: (postId: string) => Promise<void>
  toggleBookmark: (post: BookmarkApiPayload) => Promise<void>
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

const DEFAULT_PAGINATION: BookmarkPagination = {
  limit: 0,
  hasMore: false,
  nextCursor: null,
}

type BookmarkActionResult = Awaited<ReturnType<typeof addBookmarkAction>>

interface MutationOptions {
  offlineMessage?: string
  errorTitle?: string
  errorMessage?: string
  onSuccess?: () => void
  optimisticUpdate?: () => void | (() => void)
}

function normalizeRollback(result: void | (() => void)): (() => void) | undefined {
  return typeof result === "function" ? result : undefined
}

function toFeaturedImageRecord(
  value: BookmarkDomainModel["featuredImage"],
): Record<string, unknown> | null {
  return value ? { ...value } : null
}

export function useBookmarks() {
  const context = useContext(BookmarksContext)
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider")
  }
  return context
}

export interface BookmarksProviderProps {
  children: React.ReactNode
  initialData?: BookmarkListPayload | null
}

export function BookmarksProvider({ children, initialData = null }: BookmarksProviderProps) {
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
  const [, startTransition] = useTransition()
  const initialDataAppliedRef = useRef(false)
  const hydrator = useMemo(() => createBookmarkHydrator(fetch), [])

  const mutationQueue = useMemo(
    () =>
      createMutationQueue({
        schedule: (cb) => startTransition(cb),
        isOfflineError,
        onError: (error) => console.error("Bookmark mutation failed:", error),
      }),
    [startTransition],
  )

  useEffect(() => {
    cacheRef.current.clear()
    bookmarks.forEach((bookmark) => {
      cacheRef.current.set(bookmark.postId, bookmark)
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
    [bookmarks],
  )

  const getBookmark = useCallback(
    (postId: string) => cacheRef.current.get(postId),
    [bookmarks],
  )

  const applyListPayload = useCallback(
    async (payload: BookmarkListPayload) => {
      const hydrationMap = await hydrator.hydrate(payload.bookmarks)
      const hydrated = payload.bookmarks.map((row) =>
        formatBookmarkRow(row, hydrationMap[getRowPostId(row)]),
      )

      setBookmarks(hydrated)
      setStats(payload.stats ?? DEFAULT_STATS)
      setPagination(payload.pagination ?? DEFAULT_PAGINATION)
    },
    [hydrator],
  )

  const applyMutationDelta = useCallback(
    async (payload: BookmarkMutationPayload | null | undefined) => {
      if (!payload) return

      const additions = payload.added ?? []
      const updates = payload.updated ?? []
      const removals = payload.removed ?? []
      const hydrationTargets = [...additions, ...updates]
      const hydrationMap = hydrationTargets.length ? await hydrator.hydrate(hydrationTargets) : {}

      const formatRow = (row: (typeof hydrationTargets)[number]) =>
        formatBookmarkRow(row, hydrationMap[getRowPostId(row)])

      const removalSet = new Set(removals.map((row) => getRowPostId(row)))
      let nextBookmarks = bookmarksRef.current.filter(
        (bookmark) => !removalSet.has(bookmark.postId),
      )

      const changeMap = new Map<string, Bookmark>()
      const additionSet = new Set<string>()

      additions.forEach((row) => {
        const formatted = formatRow(row)
        const key = getRowPostId(row)
        changeMap.set(key, formatted)
        additionSet.add(key)
      })

      updates.forEach((row) => {
        const formatted = formatRow(row)
        changeMap.set(getRowPostId(row), formatted)
      })

      if (changeMap.size > 0) {
        nextBookmarks = nextBookmarks.map((bookmark) =>
          changeMap.get(bookmark.postId) ?? bookmark,
        )

        const existingPostIds = new Set(
          nextBookmarks.map((bookmark) => bookmark.postId),
        )
        const newEntries: Bookmark[] = []
        for (const postId of additionSet) {
          if (!existingPostIds.has(postId)) {
            const addition = changeMap.get(postId)
            if (addition) {
              existingPostIds.add(postId)
              newEntries.push(addition)
            }
          }
        }

        if (newEntries.length) {
          nextBookmarks = [...newEntries, ...nextBookmarks]
        }
      }

      setBookmarks(nextBookmarks)

      const statsDelta = payload.statsDelta ?? EMPTY_STATS_DELTA
      if (hasStatsDelta(statsDelta)) {
        const nextStats = applyStatsDelta(statsRef.current, statsDelta)
        setStats(nextStats)
        setPagination((prev) => ({
          ...prev,
          limit: Math.max(0, (prev.limit || 0) + statsDelta.total),
        }))
      }
    },
    [hydrator],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => mutationQueue.process()

    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [mutationQueue])

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
          rollback = normalizeRollback(options.optimisticUpdate())
        }

        setIsLoading(true)
        try {
          await ensureSessionFreshness()
          const result = await action()

          if (result?.error) throw result.error
          if (result?.data) {
            await applyMutationDelta(result.data as BookmarkMutationPayload)
          }

          options.onSuccess?.()
          resolveTask()
        } catch (error) {
          if (isOfflineError(error)) {
            toast({
              title: "Offline",
              description: options.offlineMessage || "We'll sync your bookmark once you're back online.",
            })
            resolveTask()
            throw error
          }

          if (rollback) rollback()

          const actionError = ensureActionError(error, options.errorMessage || "Failed to update bookmarks.")

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

      mutationQueue.enqueue(task)
      return taskPromise
    },
    [applyMutationDelta, ensureSessionFreshness, mutationQueue, toast],
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

        if (result.error) throw result.error
        if (result.data) await applyListPayload(result.data)
      } catch (error) {
        if (isOfflineError(error)) {
          console.warn("Failed to fetch bookmarks due to offline mode", error)
          toast({ title: "Offline", description: "Bookmarks will sync once you're back online." })
        } else {
          const actionError = ensureActionError(error, "Failed to load bookmarks")
          console.error("Error fetching bookmarks:", actionError)
          toast({ title: "Error", description: actionError.message, variant: "destructive" })
        }
      } finally {
        setLoading(false)
      }
    },
    [applyListPayload, ensureSessionFreshness, toast, user],
  )

  useEffect(() => {
    if (!user) {
      setBookmarks([])
      setStats(DEFAULT_STATS)
      setPagination(DEFAULT_PAGINATION)
      setLoading(false)
      initialDataAppliedRef.current = false
      return
    }

    if (initialData && !initialDataAppliedRef.current) {
      initialDataAppliedRef.current = true
      setLoading(true)

      startTransition(() => {
        void (async () => {
          try {
            await applyListPayload(initialData)
          } finally {
            setLoading(false)
          }
        })()
      })

      return
    }

    startTransition(() => {
      void fetchBookmarks()
    })
  }, [applyListPayload, fetchBookmarks, initialData, startTransition, user])

  const addBookmark = useCallback(
    async (post: BookmarkApiPayload) => {
      if (!user) throw new Error("User not authenticated")
      const draft = apiPayloadToDomainBookmarkDraft(post)
      if (!draft.postId || isBookmarked(draft.postId)) return

      const editionCode = draft.editionCode ?? null
      const featuredImage = extractFeaturedImage(draft.featuredImage)
      const payload: AddBookmarkInput = {
        postId: draft.postId,
        editionCode,
        collectionId: draft.collectionId || null,
        title: extractText(draft.title) || "Untitled Post",
        slug: typeof draft.slug === "string" ? draft.slug : "",
        excerpt: extractText(draft.excerpt),
        featuredImage: toFeaturedImageRecord(featuredImage),
        category: draft.category || null,
        tags: draft.tags || null,
        note: draft.note || null,
      }

      const optimisticBookmark: BookmarkDomainModel = {
        id: `temp-${Date.now()}`,
        userId: user.id,
        postId: draft.postId,
        editionCode: editionCode || undefined,
        collectionId: draft.collectionId || undefined,
        title: payload.title || "Untitled Post",
        slug: payload.slug || undefined,
        excerpt: payload.excerpt || undefined,
        createdAt: new Date().toISOString(),
        featuredImage: payload.featuredImage || null,
        category: draft.category || undefined,
        tags: draft.tags || undefined,
        readState: "unread",
        note: draft.note || undefined,
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

        const nextBookmarks = previousBookmarks.filter((b) => b.postId !== postId)
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

      if (Object.prototype.hasOwnProperty.call(updates, "editionCode")) sanitized.editionCode = updates.editionCode ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "title")) sanitized.title = updates.title ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "slug")) sanitized.slug = updates.slug ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "excerpt")) sanitized.excerpt = updates.excerpt ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "category")) sanitized.category = updates.category ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "tags")) sanitized.tags = updates.tags ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "readState")) sanitized.readState = updates.readState ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "note")) sanitized.note = updates.note ?? null
      if (Object.prototype.hasOwnProperty.call(updates, "featuredImage")) {
        sanitized.featuredImage = toFeaturedImageRecord(updates.featuredImage ?? null)
      }
      if (Object.prototype.hasOwnProperty.call(updates, "collectionId")) sanitized.collectionId = updates.collectionId ?? null

      return executeMutation(() => updateBookmarkAction({ postId, updates: sanitized }), {
        offlineMessage: "We'll update this bookmark when you're back online.",
        errorTitle: "Bookmark update failed",
        errorMessage: "Failed to update bookmark.",
        optimisticUpdate: () => {
          const previousBookmarks = bookmarksRef.current
          const previousStats = statsRef.current

          const nextBookmarks = previousBookmarks.map((bookmark) =>
            bookmark.postId === postId ? { ...bookmark, ...updates } : bookmark,
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

  const bulkRemoveBookmarks = useCallback(
    async (postIds: string[]) => {
      if (!user || postIds.length === 0) return

      return executeMutation(() => bulkRemoveBookmarksAction({ postIds }), {
        offlineMessage: "We'll remove these bookmarks when you're back online.",
        errorTitle: "Bulk removal failed",
        errorMessage: "Failed to remove bookmarks.",
        onSuccess: () => {
          toast({ title: "Bookmarks removed", description: `${postIds.length} bookmarks removed successfully` })
        },
        optimisticUpdate: () => {
          const previousBookmarks = bookmarksRef.current
          const previousStats = statsRef.current

          const nextBookmarks = previousBookmarks.filter(
            (bookmark) => !postIds.includes(bookmark.postId),
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
          toast({ title: "Bookmark queued", description: "We'll sync your bookmark once you're back online." })
          break
        case "BACKGROUND_SYNC_QUEUE_REPLAYED":
          toast({ title: "Bookmarks synced", description: "Your offline bookmark changes have been saved." })
          void fetchBookmarks({ revalidate: true })
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
            (bookmark.postId) === postId
              ? { ...bookmark, readState: "read" as const }
              : bookmark,
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
            (bookmark.postId) === postId
              ? { ...bookmark, readState: "unread" as const }
              : bookmark,
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

  const addNote = useCallback(async (postId: string, note: string) => {
    await updateBookmark(postId, { note })
  }, [updateBookmark])

  const toggleBookmark = useCallback(async (post: BookmarkApiPayload) => {
    const draft = apiPayloadToDomainBookmarkDraft(post)
    if (!draft.postId) return

    if (isBookmarked(draft.postId)) {
      await removeBookmark(draft.postId)
    } else {
      await addBookmark(post)
    }
  }, [addBookmark, removeBookmark, isBookmarked])

  const searchBookmarks = useCallback(
    (query: string): Bookmark[] => {
      if (!query.trim()) return bookmarks

      const searchTerm = query.toLowerCase()
      return bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(searchTerm) ||
          bookmark.excerpt?.toLowerCase().includes(searchTerm) ||
          bookmark.note?.toLowerCase().includes(searchTerm) ||
          bookmark.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)),
      )
    },
    [bookmarks],
  )

  const filterByCategory = useCallback(
    (category: string): Bookmark[] => bookmarks.filter((bookmark) => bookmark.category === category),
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
      toast({ title: "Export failed", description: actionError.message, variant: "destructive" })
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

export { buildHydrationPayload }
