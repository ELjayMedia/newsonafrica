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

  let initialBookmarks: Bookmark[] = []
  let initialStats: BookmarkStats = { total: 0, unread: 0, categories: {} }

  if (session?.user) {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    initialBookmarks = data || []

    const categories: Record<string, number> = {}
    let unread = 0
    for (const b of initialBookmarks) {
      if (b.read_status !== "read") unread++
      if (b.category) {
        categories[b.category] = (categories[b.category] || 0) + 1
      }
    }
    initialStats = { total: initialBookmarks.length, unread, categories }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Bookmarks</h1>

      {/* Add the debugger in development mode */}
      {process.env.NODE_ENV === "development" && <BookmarkDebugger />}

      <Suspense fallback={<BookmarksSkeleton />}>
        <BookmarksContent
          initialBookmarks={initialBookmarks}
          initialStats={initialStats}
        />
      </Suspense>
    </div>
  )
}
