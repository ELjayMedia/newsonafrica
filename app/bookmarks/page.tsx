import { Suspense } from "react"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import BookmarksContent from "@/components/BookmarksContent"
import type { Bookmark, BookmarkStats } from "@/contexts/BookmarksContext"
import BookmarksSkeleton from "@/components/BookmarksSkeleton"
import { BookmarkDebugger } from "@/components/BookmarkDebugger"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Bookmarks | News on Africa",
  description: "View and manage your saved articles",
}

export const dynamic = "force-dynamic"

export default async function BookmarksPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let initialBookmarks: Bookmark[] | undefined = undefined
  let initialStats: BookmarkStats | undefined = undefined

  if (session?.user) {
    const { data: bookmarksData } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    initialBookmarks = bookmarksData || []

    // Calculate stats server-side
    const total = initialBookmarks.length
    const unread = initialBookmarks.filter((b) => b.read_status !== "read").length
    const categories: Record<string, number> = {}
    initialBookmarks.forEach((bookmark) => {
      if (bookmark.category) {
        categories[bookmark.category] = (categories[bookmark.category] || 0) + 1
      }
    })
    initialStats = { total, unread, categories }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Bookmarks</h1>

      {/* Add the debugger in development mode */}
      {process.env.NODE_ENV === "development" && <BookmarkDebugger />}

      <Suspense fallback={<BookmarksSkeleton />}>
        <BookmarksContent
          initialSession={session}
          initialBookmarks={initialBookmarks}
          initialStats={initialStats}
        />
      </Suspense>
    </div>
  )
}
