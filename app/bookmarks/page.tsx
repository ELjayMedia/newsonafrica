import { Suspense } from "react"
import type { Metadata } from "next"

import BookmarksContent from "@/components/BookmarksContent"
import BookmarksSkeleton from "@/components/BookmarksSkeleton"

export const metadata: Metadata = {
  title: "Your Bookmarks | News on Africa",
  description: "View and manage your saved articles",
}

export default function BookmarksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Bookmarks</h1>

      <Suspense fallback={<BookmarksSkeleton />}>
        <BookmarksContent />
      </Suspense>
    </div>
  )
}
