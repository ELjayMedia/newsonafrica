import type React from "react"

import { cookies } from "next/headers"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { BookmarksProvider } from "@/contexts/BookmarksContext"
import { SUPABASE_UNAVAILABLE_ERROR, createServerClient } from "@/utils/supabase/server"
import { env } from "@/config/env"
import { cacheTags } from "@/lib/cache"
import { getServerCountry } from "@/lib/utils/routing"
import type { BookmarkListPayload } from "@/types/bookmarks"

export const dynamic = "force-dynamic"

export default async function BookmarksLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()

  if (!supabase) {
    console.warn(SUPABASE_UNAVAILABLE_ERROR)

    return (
      <BookmarksProvider initialData={null}>
        <ProtectedRoute>{children}</ProtectedRoute>
      </BookmarksProvider>
    )
  }
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
      const edition = getServerCountry()
      const bookmarkTags = new Set([
        cacheTags.bookmarks(edition),
        cacheTags.bmUser(session.user.id),
      ])

      const response = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/api/bookmarks`, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(serializedCookies ? { cookie: serializedCookies } : {}),
        },
        next: { tags: Array.from(bookmarkTags) },
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
