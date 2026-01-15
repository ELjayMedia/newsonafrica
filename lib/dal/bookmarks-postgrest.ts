// POSTGREST CONTRACT SNAPSHOT: bookmarks (User Bookmarks CRUD)
// ============================================================
// Endpoint: POST /rest/v1/bookmarks
// Auth: JWT (authenticated users only)
// RLS: user_id = auth.uid()
// Columns: id, user_id, post_id, post_slug, post_title, edition, created_at

import "server-only"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface BookmarkData {
  id: string
  user_id: string
  post_id: number
  post_slug: string
  post_title: string
  edition: string
  created_at: string
}

export async function createBookmark(
  accessToken: string,
  bookmark: { post_id: number; post_slug: string; post_title: string; edition: string },
): Promise<BookmarkData> {
  const url = `${SUPABASE_URL}/rest/v1/bookmarks?select=id,user_id,post_id,post_slug,post_title,edition,created_at`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      ...bookmark,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create bookmark: ${response.statusText}`)
  }

  const data = await response.json()
  revalidateTag(cacheTags.bookmarks(bookmark.edition))
  return data[0] as BookmarkData
}

export async function listUserBookmarks(
  accessToken: string,
  userId: string,
  edition?: string,
  options?: { limit?: number },
): Promise<BookmarkData[]> {
  const requestedLimit = options?.limit ?? 20
  const limit = Math.min(Math.max(requestedLimit, 1), 100)
  const params = new URLSearchParams({
    select: "id,user_id,post_id,post_slug,post_title,edition,created_at",
    order: "created_at.desc",
    limit: String(limit),
  })

  if (edition) {
    params.append("edition", `eq.${edition}`)
  }

  const url = `${SUPABASE_URL}/rest/v1/bookmarks?${params.toString()}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch bookmarks: ${response.statusText}`)
  }

  return (await response.json()) as BookmarkData[]
}

export async function deleteBookmark(accessToken: string, userId: string, bookmarkId: string): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/bookmarks?id=eq.${bookmarkId}&user_id=eq.${userId}`

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete bookmark: ${response.statusText}`)
  }

  revalidateTag(cacheTags.bookmarks(undefined))
}
