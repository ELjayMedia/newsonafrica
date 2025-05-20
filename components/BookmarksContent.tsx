"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"
import { useBookmarks } from "@/contexts/BookmarksContext"
import type { Session } from "@supabase/supabase-js"
import { BookmarkButton } from "./BookmarkButton"
import { formatDate } from "@/utils/date-utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Bookmark, AlertTriangle, Search, SortAsc, SortDesc, Calendar, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import ErrorBoundary from "@/components/ErrorBoundary"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface BookmarksContentProps {
  initialSession: Session | null
}

type BookmarkType = {
  id: string
  user_id: string
  post_id: string
  title?: string
  slug?: string
  featuredImage?:
    | {
        url: string
        width?: number
        height?: number
      }
    | {
        node: {
          sourceUrl: string
        }
      }
  excerpt?: string
  created_at: string
}

function BookmarksSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden flex flex-col h-full animate-pulse">
          <div className="relative">
            <div className="aspect-video relative overflow-hidden bg-gray-200"></div>
          </div>
          <CardContent className="flex-grow pt-4">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </CardContent>
          <CardFooter className="pt-0 text-sm text-gray-500">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export function BookmarksContent({ initialSession }: BookmarksContentProps) {
  const router = useRouter()
  const { user, loading: userLoading, isAuthenticated } = useUser()
  const { bookmarks, loading: bookmarksLoading, toggleBookmark } = useBookmarks()
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "alphabetical">("newest")
  const [isRLSError, setIsRLSError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!userLoading && !isAuthenticated && initialSession === null) {
      router.push("/auth?redirectTo=/bookmarks")
    }
  }, [userLoading, isAuthenticated, initialSession, router])

  // Process bookmarks when they change or when search/sort changes
  useEffect(() => {
    if (!bookmarks) return

    let result = [...bookmarks] as BookmarkType[]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (bookmark) => bookmark.title?.toLowerCase().includes(query) || bookmark.excerpt?.toLowerCase().includes(query),
      )
    }

    // Apply sorting
    switch (sortOrder) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "alphabetical":
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        break
    }

    setFilteredBookmarks(result)
  }, [bookmarks, searchQuery, sortOrder])

  // Handle bookmark removal
  const handleBookmarkRemoved = (postId: string) => {
    // The actual removal is handled by the BookmarksContext
    // This function can be used for any UI-specific updates after removal
  }

  // Get image URL from bookmark
  const getImageUrl = (bookmark: BookmarkType) => {
    if (!bookmark.featuredImage) return "/placeholder.svg"

    if ("url" in bookmark.featuredImage) {
      return bookmark.featuredImage.url
    } else if ("node" in bookmark.featuredImage) {
      return bookmark.featuredImage.node.sourceUrl
    }

    return "/placeholder.svg"
  }

  // Show loading state for initial data fetch
  if (userLoading || bookmarksLoading) {
    return <BookmarksSkeleton />
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
        <p className="mb-6">You need to be logged in to view your bookmarks.</p>
        <Button onClick={() => router.push("/auth?redirectTo=/bookmarks")}>Sign In</Button>
      </div>
    )
  }

  // Show RLS error with setup option
  if (isRLSError) {
    return (
      <div className="py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">Database Security Configuration Required</h3>
              <p className="text-amber-700 mb-4">
                The bookmarks feature requires Row-Level Security policies to be set up in the database. This is a
                one-time configuration that ensures your data is secure.
              </p>
              <p className="text-amber-700 mb-4">
                If you're an administrator, you can set up the required policies by visiting the admin page.
              </p>
              <Button asChild variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                <Link href="/admin">Go to Admin Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show general error message
  if (error && !isRLSError) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  // Show empty state
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <Bookmark className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">You have no bookmarks yet</h2>
        <p className="text-gray-500 mb-6">Save articles to read later by clicking the bookmark icon on any article.</p>
        <Button asChild>
          <Link href="/">Browse Articles</Link>
        </Button>
      </div>
    )
  }

  // Show filtered empty state
  if (filteredBookmarks.length === 0 && searchQuery) {
    return (
      <div>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                {sortOrder === "newest" ? (
                  <>
                    <SortDesc className="mr-2 h-4 w-4" /> Newest
                  </>
                ) : sortOrder === "oldest" ? (
                  <>
                    <SortAsc className="mr-2 h-4 w-4" /> Oldest
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" /> Alphabetical
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                <SortDesc className="mr-2 h-4 w-4" /> Newest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                <SortAsc className="mr-2 h-4 w-4" /> Oldest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("alphabetical")}>
                <Calendar className="mr-2 h-4 w-4" /> Alphabetical
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-center py-12">
          <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No matching bookmarks</h2>
          <p className="text-gray-500 mb-6">No bookmarks match your search criteria.</p>
          <Button variant="outline" onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              {sortOrder === "newest" ? (
                <>
                  <SortDesc className="mr-2 h-4 w-4" /> Newest
                </>
              ) : sortOrder === "oldest" ? (
                <>
                  <SortAsc className="mr-2 h-4 w-4" /> Oldest
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" /> Alphabetical
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortOrder("newest")}>
              <SortDesc className="mr-2 h-4 w-4" /> Newest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
              <SortAsc className="mr-2 h-4 w-4" /> Oldest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder("alphabetical")}>
              <Calendar className="mr-2 h-4 w-4" /> Alphabetical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBookmarks.map((bookmark) => (
          <Card key={bookmark.id} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="relative">
              <Link href={`/article/${bookmark.slug}`}>
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={getImageUrl(bookmark) || "/placeholder.svg"}
                    alt={bookmark.title || "Bookmarked article"}
                    className="object-cover transition-transform hover:scale-105"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              </Link>
              <div className="absolute top-2 right-2">
                <BookmarkButton
                  postId={bookmark.post_id}
                  title={bookmark.title}
                  slug={bookmark.slug}
                  featuredImage={
                    "url" in (bookmark.featuredImage || {})
                      ? (bookmark.featuredImage as { url: string })
                      : { url: (bookmark.featuredImage as any)?.node?.sourceUrl || "" }
                  }
                  variant="default"
                  size="icon"
                  className="bg-white/90 hover:bg-white text-primary"
                  onRemoveSuccess={() => handleBookmarkRemoved(bookmark.post_id)}
                />
              </div>
            </div>

            <CardContent className="flex-grow pt-4">
              <Link href={`/article/${bookmark.slug}`} className="group">
                <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {bookmark.title || "Untitled Article"}
                </h2>
              </Link>
              {bookmark.excerpt && (
                <p className="text-gray-600 line-clamp-2 text-sm mb-2">{bookmark.excerpt.replace(/<[^>]*>/g, "")}</p>
              )}
            </CardContent>

            <CardFooter className="pt-0 text-sm text-gray-500 flex justify-between items-center">
              <span>{formatDate(bookmark.created_at)}</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/article/${bookmark.slug}`}>
                  <Eye className="h-4 w-4 mr-1" /> Read
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ErrorBoundary>
  )
}
