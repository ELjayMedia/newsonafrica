"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"
import type { Session } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"
import { BookmarkButton } from "./BookmarkButton"
import { formatDate } from "@/utils/date-utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Bookmark, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import ErrorBoundary from "@/components/ErrorBoundary"

interface BookmarksContentProps {
  initialSession: Session | null
}

type BookmarkType = {
  id: string
  user_id: string
  post_id: string
  title?: string
  slug?: string
  featuredImage?: {
    url: string
    width?: number
    height?: number
  }
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
  const { user, loading, isAuthenticated } = useUser()
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRLSError, setIsRLSError] = useState(false)
  const supabase = createClient()

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!loading && !isAuthenticated && initialSession === null) {
      router.push("/auth?redirectTo=/bookmarks")
    }
  }, [loading, isAuthenticated, initialSession, router])

  // Fetch bookmarks
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching bookmarks:", error)

          // Check if it's an RLS error
          if (error.message.includes("row-level security")) {
            setIsRLSError(true)
            throw new Error("Permission error: Row-level security policies need to be configured.")
          }

          throw error
        }

        setBookmarks(data || [])
        setIsRLSError(false)
      } catch (err: any) {
        console.error("Error fetching bookmarks:", err)
        setError(err.message || "Failed to load bookmarks")
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && user) {
      fetchBookmarks()
    }
  }, [isAuthenticated, user, supabase])

  // Handle bookmark removal
  const handleBookmarkRemoved = (postId: string) => {
    setBookmarks((prevBookmarks) => prevBookmarks.filter((bookmark) => bookmark.post_id !== postId))
  }

  // Show loading state for initial data fetch
  if (loading || isLoading) {
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

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookmarks.map((bookmark) => (
          <Card key={bookmark.id} className="overflow-hidden flex flex-col h-full">
            <div className="relative">
              <Link href={`/article/${bookmark.slug}`}>
                <div className="aspect-video relative overflow-hidden">
                  {bookmark.featuredImage?.url ? (
                    <Image
                      src={bookmark.featuredImage.url || "/placeholder.svg"}
                      alt={bookmark.title || "Bookmarked article"}
                      className="object-cover transition-transform hover:scale-105"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="absolute top-2 right-2">
                <BookmarkButton
                  postId={bookmark.post_id}
                  title={bookmark.title}
                  slug={bookmark.slug}
                  featuredImage={bookmark.featuredImage}
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
            </CardContent>

            <CardFooter className="pt-0 text-sm text-gray-500">
              <span>{formatDate(bookmark.created_at)}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ErrorBoundary>
  )
}
