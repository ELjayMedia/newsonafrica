"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { CACHE_TAGS } from "@/lib/cache/constants"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import { withSupabaseSession, type SupabaseServerClient } from "@/app/actions/supabase"
import type { Database } from "@/types/supabase"
import {
  fetchBookmarkStats,
  getDefaultBookmarkStats,
} from "@/lib/bookmarks/stats"
import { derivePagination } from "@/lib/bookmarks/pagination"
import { executeListQuery } from "@/lib/supabase/list-query"
import {
  BOOKMARK_LIST_SELECT_COLUMNS,
  type BookmarkListPayload,
  type BookmarkListRow,
  type BookmarkRow,
} from "@/types/bookmarks"

type BookmarkInsert = Database["public"]["Tables"]["bookmarks"]["Insert"]
export type {
  BookmarkListPayload,
  BookmarkPagination,
  BookmarkRow,
  BookmarkStats,
} from "@/types/bookmarks"

const BOOKMARK_PATHS = ["/bookmarks"]

export interface ListBookmarksOptions {
  revalidate?: boolean
}

export interface AddBookmarkInput {
  postId: string
  title?: string
  slug?: string
  excerpt?: string
  featuredImage?: BookmarkRow["featured_image"] | null
  category?: string | null
  tags?: string[] | null
  notes?: string | null
  country?: string | null
}

export interface UpdateBookmarkInput {
  postId: string
  updates: Partial<Omit<BookmarkRow, "id" | "user_id" | "post_id" | "created_at">>
}

export interface BulkRemoveInput {
  postIds: string[]
}

function ensureUserId(session: { user: { id: string } } | null | undefined): string {
  const userId = session?.user?.id
  if (!userId) {
    throw new ActionError("Unauthorized", { status: 401 })
  }
  return userId
}

async function revalidateBookmarkCache() {
  revalidateTag(CACHE_TAGS.BOOKMARKS)
  for (const path of BOOKMARK_PATHS) {
    revalidatePath(path)
  }
}

async function fetchBookmarkList(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<BookmarkListPayload> {
  const { data, error } = await executeListQuery(supabase, "bookmarks", (query) =>
    query
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  )

  if (error) {
    throw new ActionError("Failed to fetch bookmarks", { cause: error })
  }

  const rows = (data ?? []) as BookmarkListRow[]
  const stats = rows.length
    ? await fetchBookmarkStats(supabase, userId)
    : getDefaultBookmarkStats()
  const { items } = derivePagination({
    page: 1,
    limit: rows.length || 1,
    rows,
  })

  return {
    bookmarks: items,
    stats,
    pagination: {
      page: 1,
      limit: rows.length || 1,
      hasMore: false,
      nextPage: null,
      nextCursor: null,
    },
  }
}

export async function listBookmarks(
  options: ListBookmarksOptions = {},
): Promise<ActionResult<BookmarkListPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (options.revalidate) {
      await revalidateBookmarkCache()
    }

    return fetchBookmarkList(supabase, userId)
  })
}

export async function addBookmark(
  payload: AddBookmarkInput,
): Promise<ActionResult<BookmarkListPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)
    const postId = payload.postId

    if (!postId) {
      throw new ActionError("Post ID is required", { status: 400 })
    }

    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle()

    if (existing) {
      throw new ActionError("Bookmark already exists", { status: 409 })
    }

    const newBookmark: BookmarkInsert = {
      user_id: userId,
      post_id: postId,
      country: payload.country ?? null,
      title: payload.title || "Untitled Post",
      slug: payload.slug || "",
      excerpt: payload.excerpt || "",
      featured_image:
        payload.featuredImage && typeof payload.featuredImage === "object"
          ? payload.featuredImage
          : null,
      category: payload.category ?? null,
      tags: payload.tags ?? null,
      read_status: "unread",
      notes: payload.notes ?? null,
    }

    const { error } = await supabase.from("bookmarks").insert(newBookmark)

    if (error) {
      throw new ActionError("Failed to add bookmark", { cause: error })
    }

    await revalidateBookmarkCache()

    return fetchBookmarkList(supabase, userId)
  })
}

export async function removeBookmark(
  postId: string,
): Promise<ActionResult<BookmarkListPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (!postId) {
      throw new ActionError("Post ID is required", { status: 400 })
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId)

    if (error) {
      throw new ActionError("Failed to remove bookmark", { cause: error })
    }

    await revalidateBookmarkCache()

    return fetchBookmarkList(supabase, userId)
  })
}

export async function bulkRemoveBookmarks(
  payload: BulkRemoveInput,
): Promise<ActionResult<BookmarkListPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (!payload.postIds?.length) {
      throw new ActionError("Post IDs are required", { status: 400 })
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .in("post_id", payload.postIds)

    if (error) {
      throw new ActionError("Failed to remove bookmarks", { cause: error })
    }

    await revalidateBookmarkCache()

    return fetchBookmarkList(supabase, userId)
  })
}

export async function updateBookmark(
  payload: UpdateBookmarkInput,
): Promise<ActionResult<BookmarkListPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (!payload.postId) {
      throw new ActionError("Post ID is required", { status: 400 })
    }

    const sanitizedUpdates: Partial<BookmarkRow> = { ...payload.updates }

    if ("featured_image" in sanitizedUpdates) {
      sanitizedUpdates.featured_image =
        sanitizedUpdates.featured_image && typeof sanitizedUpdates.featured_image === "object"
          ? sanitizedUpdates.featured_image
          : null
    }

    const { error } = await supabase
      .from("bookmarks")
      .update(sanitizedUpdates)
      .eq("user_id", userId)
      .eq("post_id", payload.postId)

    if (error) {
      throw new ActionError("Failed to update bookmark", { cause: error })
    }

    await revalidateBookmarkCache()

    return fetchBookmarkList(supabase, userId)
  })
}

export async function markRead(postId: string): Promise<ActionResult<BookmarkListPayload>> {
  return updateBookmark({ postId, updates: { read_status: "read" } })
}

export async function markUnread(postId: string): Promise<ActionResult<BookmarkListPayload>> {
  return updateBookmark({ postId, updates: { read_status: "unread" } })
}

export async function exportBookmarks(): Promise<ActionResult<string>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    const { bookmarks } = await fetchBookmarkList(supabase, userId)

    const exportData = {
      exported_at: new Date().toISOString(),
      total_bookmarks: bookmarks.length,
      bookmarks: bookmarks.map((bookmark) => ({
        title: bookmark.title,
        slug: bookmark.slug,
        excerpt: bookmark.excerpt,
        created_at: bookmark.created_at,
        category: bookmark.category,
        tags: bookmark.tags,
        read_status: bookmark.read_status,
        notes: bookmark.notes,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  })
}
