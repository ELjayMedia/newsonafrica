import type React from "react"

import { cookies } from "next/headers"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { BookmarksProvider } from "@/contexts/BookmarksContext"
import { createClient } from "@/utils/supabase/server"
import { env } from "@/config/env"
import { CACHE_TAGS } from "@/lib/cache/constants"
import type { BookmarkListPayload } from "@/types/bookmarks"

export default async function BookmarksLayout({ children }: { children: React.ReactNode }) {
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
    <BookmarksProvider initialData={initialBookmarks}>
      <ProtectedRoute>{children}</ProtectedRoute>
    </BookmarksProvider>
  )
}
