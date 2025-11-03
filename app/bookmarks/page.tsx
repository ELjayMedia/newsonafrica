import { Suspense } from "react"
import { cookies } from "next/headers"
import type { Metadata } from "next"

import { createClient } from "@/utils/supabase/server"
import BookmarksContent from "@/components/BookmarksContent"
import BookmarksSkeleton from "@/components/BookmarksSkeleton"
import { BookmarksProvider } from "@/contexts/BookmarksContext"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { env } from "@/config/env"
import type { BookmarkListPayload } from "@/types/bookmarks"

export const metadata: Metadata = {
  title: "Your Bookmarks | News on Africa",
  description: "View and manage your saved articles",
}

export default async function BookmarksPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let initialBookmarks: BookmarkListPayload | null = null

  if (session?.user) {
    const cookieStore = cookies()
    const serializedCookies = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
      .join("; ")

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/api/bookmarks`, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(serializedCookies ? { cookie: serializedCookies } : {}),
        },
        next: { tags: [CACHE_TAGS.BOOKMARKS] },
      })

      if (response.ok) {
        initialBookmarks = (await response.json()) as BookmarkListPayload
      }
    } catch (error) {
      console.error("Failed to fetch initial bookmarks", error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Bookmarks</h1>

      <Suspense fallback={<BookmarksSkeleton />}>
        <BookmarksProvider initialData={initialBookmarks}>
          <BookmarksContent />
        </BookmarksProvider>
      </Suspense>
    </div>
  )
}
