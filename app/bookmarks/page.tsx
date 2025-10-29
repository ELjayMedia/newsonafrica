import { Suspense } from "react"
import { createClient } from "@/utils/supabase/server"
import BookmarksContent from "@/components/BookmarksContent"
import BookmarksSkeleton from "@/components/BookmarksSkeleton"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Bookmarks | News on Africa",
  description: "View and manage your saved articles",
}

export default async function BookmarksPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Bookmarks</h1>

      <Suspense fallback={<BookmarksSkeleton />}>
        <BookmarksContent initialSession={session} />
      </Suspense>
    </div>
  )
}
