"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"
import { useBookmarks, type Bookmark } from "@/contexts/BookmarksContext"
import { BookmarkButton } from "./BookmarkButton"
import { formatDate } from "@/utils/date-utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { BookmarkIcon, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import ErrorBoundary from "@/components/ErrorBoundary"
import type { Session } from "@supabase/supabase-js"

interface BookmarksContentProps {
  initialSession: Session | null
}

export function BookmarksContent({ initialSession }: BookmarksContentProps) {
  const router = useRouter()
  const { user, loading: userLoading, isAuthenticated } = useUser()
  const { bookmarks, loading, error, refreshBookmarks } = useBookmarks()
  const [isRLSError, setIsRLSError] = useState(false)

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!userLoading && !isAuthenticated && initialSession === null) {
      router.push("/auth?redirectTo=/bookmarks")
    }
  }, [userLoading, isAuthenticated, initialSession, router])

  // Check if error is related to RLS
  useEffect(() => {
    if (
      error &&
      (error.includes("row-level security") || error.includes("permission denied") || error.includes("policy"))
    ) {
      setIsRLSError(true)
    } else {
      setIsRLSError(false)
    }
  }, [error])

  // Handle bookmark removal
  const handleBookmarkRemoved = (postId: string) => {
    // The state is already updated in the context
  }

  // Show loading state for initial data fetch
  if (userLoading || loading) {
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
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => refreshBookmarks()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    )
  }

  // Show empty state
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookmarkIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">You have no bookmarks yet</h2>
        <p className="text-gray-500 mb-6">Save articles to read later by clicking the bookmark icon on any article.</p>
        <Button asChild>
          <Link href="/">Browse Articles</Link>
        </Button>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookmarks.map((bookmark) => (
          <BookmarkCard key={bookmark.id} bookmark={bookmark} onRemoveSuccess={handleBookmarkRemoved} />
        ))}
      </div>
    </ErrorBoundary>
  )
}

function BookmarkCard({
  bookmark,
  onRemoveSuccess,
}: {
  bookmark: Bookmark
  onRemoveSuccess: (postId: string) => void
}) {
  const imageUrl = bookmark.featuredImage?.node?.sourceUrl || "/news-collage.png"
  const articleUrl = `/post/${bookmark.slug}`

  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="relative">
        <Link href={articleUrl}>
          <div className="aspect-video relative overflow-hidden">
            <Image
              src={imageUrl || "/placeholder.svg"}
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
            variant="default"
            size="icon"
            className="bg-white/90 hover:bg-white text-primary shadow-sm"
            onRemoveSuccess={() => onRemoveSuccess(bookmark.post_id)}
          />
        </div>
      </div>

      <CardContent className="flex-grow pt-4">
        <Link href={articleUrl} className="group">
          <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
            {bookmark.title || "Untitled Article"}
          </h2>
        </Link>
        {bookmark.excerpt && (
          <p className="text-gray-600 line-clamp-2 text-sm mb-2">{bookmark.excerpt.replace(/<[^>]*>/g, "")}</p>
        )}
      </CardContent>

      <CardFooter className="pt-0 text-sm text-gray-500 flex justify-between items-center">
        <span>{formatDate(bookmark.created_at || bookmark.date || "")}</span>
        <Button asChild variant="ghost" size="sm" className="text-primary">
          <Link href={articleUrl}>Read Article</Link>
        </Button>
      </CardFooter>
    </Card>
  )
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
