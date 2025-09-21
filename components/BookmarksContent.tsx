"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useBookmarks } from "@/contexts/BookmarksContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
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
import { useUserPreferences } from "@/contexts/UserPreferencesContext"

type SortOption = "newest" | "oldest" | "title" | "unread"
type FilterOption = "all" | "unread" | "read"

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
    isLoading,
  } = useBookmarks()

  const { preferences, setBookmarkSortPreference } = useUserPreferences()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>(preferences.bookmarkSort)
  const [filterBy, setFilterBy] = useState<FilterOption>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [notePostId, setNotePostId] = useState<string>("")
  const [noteText, setNoteText] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    setSortBy(preferences.bookmarkSort as SortOption)
  }, [preferences.bookmarkSort])

  const handleSortChange = useCallback(
    (value: SortOption) => {
      setSortBy(value)
      void setBookmarkSortPreference(value)
    },
    [setBookmarkSortPreference],
  )

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let filtered = searchQuery ? searchBookmarks(searchQuery) : bookmarks

    // Filter by read status
    if (filterBy === "unread") {
      filtered = filtered.filter((b) => b.read_status !== "read")
    } else if (filterBy === "read") {
      filtered = filtered.filter((b) => b.read_status === "read")
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filterByCategory(selectedCategory)
    }

    // Sort bookmarks
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "title":
          return a.title.localeCompare(b.title)
        case "unread":
          if (a.read_status === "unread" && b.read_status === "read") return -1
          if (a.read_status === "read" && b.read_status === "unread") return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })
  }, [bookmarks, searchQuery, sortBy, filterBy, selectedCategory, searchBookmarks, filterByCategory])

  const handleSelectAll = useCallback(() => {
    if (selectedBookmarks.length === filteredBookmarks.length) {
      setSelectedBookmarks([])
    } else {
      setSelectedBookmarks(filteredBookmarks.map((b) => b.post_id))
    }
  }, [selectedBookmarks, filteredBookmarks])

  const handleBulkDelete = useCallback(async () => {
    if (selectedBookmarks.length === 0) return

    try {
      await bulkRemoveBookmarks(selectedBookmarks)
      setSelectedBookmarks([])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove bookmarks",
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
      toast({
        title: "Export failed",
        description: "Failed to export bookmarks",
        variant: "destructive",
      })
    }
  }, [exportBookmarks, toast])

  const handleAddNote = useCallback(async () => {
    if (!notePostId || !noteText.trim()) return

    try {
      await addNote(notePostId, noteText.trim())
      setNoteDialogOpen(false)
      setNotePostId("")
      setNoteText("")
      toast({
        title: "Note added",
        description: "Your note has been saved",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      })
    }
  }, [notePostId, noteText, addNote, toast])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookmarkCheck className="h-5 w-5 text-blue-600" />
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
              <BookOpen className="h-5 w-5 text-orange-600" />
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
              <Tag className="h-5 w-5 text-green-600" />
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport} disabled={bookmarks.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedBookmarks.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium">{selectedBookmarks.length} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isLoading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Select all */}
      {filteredBookmarks.length > 0 && (
        <div className="flex items-center space-x-2">
          <Checkbox checked={selectedBookmarks.length === filteredBookmarks.length} onCheckedChange={handleSelectAll} />
          <span className="text-sm text-gray-600">Select all</span>
        </div>
      )}

      {/* Bookmarks list */}
      <div className="space-y-4">
        {filteredBookmarks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookmarkCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarks found</h3>
              <p className="text-gray-600">
                {searchQuery ? "Try adjusting your search terms" : "Start bookmarking articles to see them here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBookmarks.map((bookmark) => (
            <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={selectedBookmarks.includes(bookmark.post_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBookmarks((prev) => [...prev, bookmark.post_id])
                      } else {
                        setSelectedBookmarks((prev) => prev.filter((id) => id !== bookmark.post_id))
                      }
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">

                        <Link
                          href={getArticleUrl(bookmark.slug, bookmark.country)}
                          className="block hover:text-blue-600 transition-colors"
                        >

                          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{bookmark.title}</h3>
                        </Link>

                        {bookmark.excerpt && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{bookmark.excerpt}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(bookmark.created_at), { addSuffix: true })}
                          </span>

                          {bookmark.read_status === "unread" && (
                            <Badge variant="secondary" className="text-xs">
                              Unread
                            </Badge>
                          )}

                          {bookmark.category && (
                            <Badge variant="outline" className="text-xs">
                              {bookmark.category}
                            </Badge>
                          )}

                          {bookmark.notes && (
                            <span className="flex items-center text-blue-600">
                              <StickyNote className="h-3 w-3 mr-1" />
                              Note
                            </span>
                          )}
                        </div>

                        {bookmark.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-gray-700">{bookmark.notes}</div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              if (bookmark.read_status === "read") {
                                markAsUnread(bookmark.post_id)
                              } else {
                                markAsRead(bookmark.post_id)
                              }
                            }}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Mark as {bookmark.read_status === "read" ? "Unread" : "Read"}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setNotePostId(bookmark.post_id)
                              setNoteText(bookmark.notes || "")
                              setNoteDialogOpen(true)
                            }}
                          >
                            <StickyNote className="h-4 w-4 mr-2" />
                            {bookmark.notes ? "Edit Note" : "Add Note"}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => removeBookmark(bookmark.post_id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={!noteText.trim()}>
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
