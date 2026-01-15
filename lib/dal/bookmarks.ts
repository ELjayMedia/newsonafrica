import "server-only"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type SupabaseServerClient = SupabaseClient<Database>
export type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"]

// POSTGREST CONTRACT: bookmarks.listUserBookmarks
export async function listUserBookmarks(
  supabase: SupabaseServerClient,
  userId: string,
  options?: { limit?: number },
): Promise<Bookmark[]> {
  const requestedLimit = options?.limit ?? 20
  const limit = Math.min(requestedLimit, 100)
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch bookmarks: ${error.message}`)
  }

  return (data || []) as Bookmark[]
}

// POSTGREST CONTRACT: bookmarks.addBookmark
export async function addBookmark(
  supabase: SupabaseServerClient,
  bookmark: Bookmark["Insert"],
): Promise<Bookmark> {
  const { data, error } = await supabase
    .from("bookmarks")
    .insert(bookmark)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add bookmark: ${error.message}`)
  }

  revalidateTag(cacheTags.bookmarks(bookmark.edition_code))

  return data as Bookmark
}

// POSTGREST CONTRACT: bookmarks.removeBookmark
export async function removeBookmark(supabase: SupabaseServerClient, userId: string, postId: string): Promise<void> {
  const { error } = await supabase.from("bookmarks").delete().eq("user_id", userId).eq("wp_post_id", postId)

  if (error) {
    throw new Error(`Failed to remove bookmark: ${error.message}`)
  }

  revalidateTag(cacheTags.bookmarks(undefined))
}
