"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useBookmarks } from "@/contexts/BookmarksContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Download,
  Trash2,
  BookOpen,
  BookmarkCheck,
  StickyNote,
  Calendar,
  Tag,
  MoreVertical,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns/formatDistanceToNow"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getArticleUrl } from "@/lib/utils/routing"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"
import { sanitizeExcerpt } from "@/lib/utils/text/sanitizeExcerpt"

type SortOption = "newest" | "oldest" | "title" | "unread"
type FilterOption = "all" | "unread" | "read"

function bookmarkPostIdKey(postId: string | number): string {
  return String(postId)
}

function BookmarksLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading bookmarks">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Controls skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      {/* List skeleton */}
      <div className="space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-4 w-4 mt-1 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2 mt-1">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function BookmarksContent() {
  const {
    bookmarks,
    loading,
    stats,
    removeBookmark,
    bulkRemoveBookmarks,
    markAsRead,
    markAsUnread,
    addNote,
    searchBookmarks,
    filterByCategory,
    exportBookmarks,
    refreshBookmarks,
    isLoading,
  } = useBookmarks()

  const { preferences, setBookmarkSortPreference } = useUserPreferences()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>(preferences.bookmarkSort as SortOption)
  const [filterBy, setFilterBy] = useState<FilterOption>("all")
  const [selectedCategory, _setSelectedCategory] = useState<string>("all")
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteBookmarkId, setNoteBookmarkId] = useState<string>("")
  const [noteText, setNoteText] = useState("")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setSortBy(preferences.bookmarkSort as SortOption)
  }, [preferences.bookmarkSort])

  const handleSortChange = useCallback(
    (value: string) => {
      const next = value as SortOption
      setSortBy(next)
      void setBookmarkSortPreference(next)
    },
    [setBookmarkSortPreference],
  )

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    setFetchError(null)
    try {
      await refreshBookmarks()
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Failed to load bookmarks. Please try again.")
    } finally {
      setIsRetrying(false)
    }
  }, [refreshBookmarks])

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let filtered = searchQuery ? searchBookmarks(searchQuery) : bookmarks

    // Filter by read status
    if (filterBy === "unread") {
      filtered = filtered.filter((b) => b.readState !== "read")
    } else if (filterBy === "read") {
      filtered = filtered.filter((b) => b.readState === "read")
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filterByCategory(selectedCategory)
    }

    // Sort bookmarks
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "title":
          return a.title.localeCompare(b.title)
        case "unread":
          if (a.readState === "unread" && b.readState === "read") return -1
          if (a.readState === "read" && b.readState === "unread") return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })
  }, [bookmarks, searchQuery, sortBy, filterBy, selectedCategory, searchBookmarks, filterByCategory])

  const handleSelectAll = useCallback(() => {
    if (selectedBookmarks.length === filteredBookmarks.length) {
      setSelectedBookmarks([])
    } else {
      setSelectedBookmarks(filteredBookmarks.map((b) => bookmarkPostIdKey(b.postId)))
    }
  }, [selectedBookmarks, filteredBookmarks])

  const handleBulkDelete = useCallback(async () => {
    if (selectedBookmarks.length === 0) return

    try {
      await bulkRemoveBookmarks(selectedBookmarks)
      setSelectedBookmarks([])
    } catch (error) {
      console.error("Failed to remove bookmarks", error)
      toast({
        title: "Error",
        description: "Failed to remove selected bookmarks. Please try again.",
        variant: "destructive",
      })
    }
  }, [selectedBookmarks, bulkRemoveBookmarks, toast])

  const handleExport = useCallback(async () => {
    try {
      const exportData = await exportBookmarks()
      const blob = new Blob([exportData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bookmarks-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export successful",
        description: "Your bookmarks have been exported",
      })
    } catch (error) {
      console.error("Failed to export bookmarks", error)
      toast({
        title: "Export failed",
        description: "Failed to export bookmarks. Please try again.",
        variant: "destructive",
      })
    }
  }, [exportBookmarks, toast])

  const handleAddNote = useCallback(async () => {
    if (!noteBookmarkId || !noteText.trim()) return

    try {
      await addNote(noteBookmarkId, noteText.trim())
      setNoteDialogOpen(false)
      setNoteBookmarkId("")
      setNoteText("")
      toast({
        title: "Note saved",
        description: "Your note has been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save note", error)
      toast({
        title: "Failed to save note",
        description: "Something went wrong saving your note. Please try again.",
        variant: "destructive",
      })
    }
  }, [noteBookmarkId, noteText, addNote, toast])

  const handleRemoveBookmark = useCallback(
    async (postId: string) => {
      try {
        await removeBookmark(postId)
        toast({
          title: "Bookmark removed",
          description: "Article removed from your bookmarks.",
        })
      } catch (error) {
        console.error("Failed to remove bookmark", error)
        toast({
          title: "Failed to remove bookmark",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    },
    [removeBookmark, toast],
  )

  if (loading) {
    return <BookmarksLoadingSkeleton />
  }

  // Error state
  if (fetchError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load bookmarks</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{fetchError}</p>
          <Button onClick={handleRetry} disabled={isRetrying} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
            {isRetrying ? "Retrying..." : "Try again"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookmarkCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Total Bookmarks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-orange-600" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold">{stats.unread}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-green-600" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(stats.categories).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search bookmarks"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-32" aria-label="Sort bookmarks">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="unread">Unread first</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
            <SelectTrigger className="w-28" aria-label="Filter bookmarks">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={bookmarks.length === 0 || isLoading}
            aria-label="Export bookmarks as JSON"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetry}
            disabled={isRetrying || isLoading}
            aria-label="Refresh bookmarks"
            title="Refresh bookmarks"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedBookmarks.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg" role="toolbar" aria-label="Bulk actions">
          <span className="text-sm font-medium">{selectedBookmarks.length} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isLoading}>
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Select all */}
      {filteredBookmarks.length > 0 && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedBookmarks.length === filteredBookmarks.length && filteredBookmarks.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm text-gray-600 cursor-pointer">
            Select all ({filteredBookmarks.length})
          </label>
        </div>
      )}

      {/* Bookmarks list */}
      <div className="space-y-4" aria-label="Saved bookmarks">
        {filteredBookmarks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookmarkCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterBy !== "all" ? "No bookmarks match your filters" : "No bookmarks yet"}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {searchQuery
                  ? "Try adjusting your search terms or clearing the search."
                  : filterBy !== "all"
                    ? "Try changing the filter to see more bookmarks."
                    : "Start reading and save articles to access them anytime."}
              </p>
              {(searchQuery || filterBy !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setFilterBy("all")
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBookmarks.map((bookmark) => {
            const sanitizedExcerpt = sanitizeExcerpt(bookmark.excerpt)
            const bookmarkPostId = bookmarkPostIdKey(bookmark.postId)

            const slug = bookmark.slug ?? ""
            const href = slug ? getArticleUrl(slug, bookmark.editionCode ?? undefined) : "/"

            return (
              <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      checked={selectedBookmarks.includes(bookmarkPostId)}
                      onCheckedChange={(checked) => {
                        const isChecked = Boolean(checked)
                        if (isChecked) {
                          setSelectedBookmarks((prev) => [...prev, bookmarkPostId])
                        } else {
                          setSelectedBookmarks((prev) => prev.filter((id) => id !== bookmarkPostId))
                        }
                      }}
                      aria-label={`Select "${bookmark.title}"`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {slug ? (
                            <Link href={href} className="block hover:text-blue-600 transition-colors">
                              <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{bookmark.title}</h3>
                            </Link>
                          ) : (
                            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{bookmark.title}</h3>
                          )}

                          {sanitizedExcerpt && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{sanitizedExcerpt}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                              {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                            </span>

                            {bookmark.readState === "unread" && (
                              <Badge variant="secondary" className="text-xs">
                                Unread
                              </Badge>
                            )}

                            {bookmark.category && (
                              <Badge variant="outline" className="text-xs">
                                {bookmark.category}
                              </Badge>
                            )}

                            {bookmark.editionCode && (
                              <Badge variant="outline" className="text-xs">
                                {String(bookmark.editionCode).toUpperCase()}
                              </Badge>
                            )}

                            {bookmark.note && (
                              <span className="flex items-center text-blue-600">
                                <StickyNote className="h-3 w-3 mr-1" aria-hidden="true" />
                                Note
                              </span>
                            )}
                          </div>

                          {bookmark.note && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-sm text-gray-700">
                              {bookmark.note}
                            </div>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label={`Actions for "${bookmark.title}"`}>
                              <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                if (bookmark.readState === "read") {
                                  void markAsUnread(bookmarkPostId)
                                } else {
                                  void markAsRead(bookmarkPostId)
                                }
                              }}
                            >
                              <BookOpen className="h-4 w-4 mr-2" aria-hidden="true" />
                              Mark as {bookmark.readState === "read" ? "Unread" : "Read"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setNoteBookmarkId(bookmarkPostId)
                                setNoteText(bookmark.note || "")
                                setNoteDialogOpen(true)
                              }}
                            >
                              <StickyNote className="h-4 w-4 mr-2" aria-hidden="true" />
                              {bookmark.note ? "Edit Note" : "Add Note"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => void handleRemoveBookmark(bookmarkPostId)}
                              className="text-red-600 focus:text-red-600"
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                              Remove bookmark
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteText ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Write your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              aria-label="Bookmark note"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={!noteText.trim() || isLoading}>
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
