"use server"

import { revalidateTag } from "next/cache"

import { cacheTags } from "@/lib/cache"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import { withSupabaseSession, type SupabaseServerClient } from "@/app/actions/supabase"
import type { Database } from "@/types/supabase"
import {
  fetchBookmarkStats,
  getDefaultBookmarkStats,
} from "@/lib/bookmarks/stats"
import { derivePagination } from "@/lib/bookmarks/pagination"
import { executeListQuery } from "@/lib/supabase/list-query"
import { combineStatsDeltas, computeStatsDelta } from "@/lib/bookmarks/mutation-delta"
import {
  BOOKMARK_LIST_SELECT_COLUMNS,
  type BookmarkListPayload,
  type BookmarkListRow,
  type BookmarkMutationPayload,
  type BookmarkRow,
} from "@/types/bookmarks"

type BookmarkInsert = Database["public"]["Tables"]["bookmarks"]["Insert"]
export type {
  BookmarkListPayload,
  BookmarkPagination,
  BookmarkMutationPayload,
  BookmarkRow,
  BookmarkStats,
  BookmarkStatsDelta,
} from "@/types/bookmarks"

const BOOKMARK_EXPORT_COLUMNS =
  "title, slug, excerpt, created_at:createdAt, category, tags, read_state:readState, notes"

export interface ListBookmarksOptions {
  revalidate?: boolean
}

export interface AddBookmarkInput {
  postId: string
  title?: string
  slug?: string
  excerpt?: string
  featuredImage?: BookmarkRow["featuredImage"] | null
  category?: string | null
  tags?: string[] | null
  notes?: string | null
  country?: string | null
}

export interface UpdateBookmarkInput {
  postId: string
  updates: Partial<Omit<BookmarkRow, "id" | "userId" | "postId" | "createdAt">>
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

async function revalidateBookmarkCache(
  userId: string,
  editions: Iterable<string | null | undefined> = [],
) {
  const tags = new Set<string>()

  for (const edition of editions) {
    tags.add(cacheTags.bookmarks(edition))
  }

  if (tags.size === 0) {
    tags.add(cacheTags.bookmarks(undefined))
  }

  revalidateTag(cacheTags.bmUser(userId))
  tags.forEach((tag) => revalidateTag(tag))
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
    limit: rows.length || 1,
    rows,
  })

  return {
    bookmarks: items,
    stats,
    pagination: {
      limit: rows.length || 1,
      hasMore: false,
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
      await revalidateBookmarkCache(userId)
    }

    return fetchBookmarkList(supabase, userId)
  })
}

export async function addBookmark(
  payload: AddBookmarkInput,
): Promise<ActionResult<BookmarkMutationPayload>> {
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
      read_state: "unread",
      notes: payload.notes ?? null,
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .insert(newBookmark)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      throw new ActionError("Failed to add bookmark", { cause: error })
    }

    const inserted = data as BookmarkListRow
    const edition =
      typeof inserted.country === "string" ? inserted.country : payload.country ?? null

    await revalidateBookmarkCache(userId, [edition])

    return {
      added: [inserted],
      statsDelta: computeStatsDelta({ next: inserted }),
    }
  })
}

export async function removeBookmark(
  postId: string,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (!postId) {
      throw new ActionError("Post ID is required", { status: 400 })
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)

    if (error) {
      throw new ActionError("Failed to remove bookmark", { cause: error })
    }

    const removedRows = (data ?? []) as BookmarkListRow[]
    await revalidateBookmarkCache(
      userId,
      removedRows.map((row) => (typeof row.country === "string" ? row.country : null)),
    )
    const statsDelta = combineStatsDeltas(
      removedRows.map((row) => computeStatsDelta({ previous: row })),
    )

    return {
      removed: removedRows,
      statsDelta,
    }
  })
}

export async function bulkRemoveBookmarks(
  payload: BulkRemoveInput,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (!payload.postIds?.length) {
      throw new ActionError("Post IDs are required", { status: 400 })
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .in("post_id", payload.postIds)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)

    if (error) {
      throw new ActionError("Failed to remove bookmarks", { cause: error })
    }

    const removedRows = (data ?? []) as BookmarkListRow[]
    await revalidateBookmarkCache(
      userId,
      removedRows.map((row) => (typeof row.country === "string" ? row.country : null)),
    )
    const statsDelta = combineStatsDeltas(
      removedRows.map((row) => computeStatsDelta({ previous: row })),
    )

    return {
      removed: removedRows,
      statsDelta,
    }
  })
}

export async function updateBookmark(
  payload: UpdateBookmarkInput,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (!payload.postId) {
      throw new ActionError("Post ID is required", { status: 400 })
    }

    const dbUpdates: Database["public"]["Tables"]["bookmarks"]["Update"] = {}

    if (Object.prototype.hasOwnProperty.call(payload.updates, "country")) {
      dbUpdates.country = payload.updates.country ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "title")) {
      dbUpdates.title = payload.updates.title ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "slug")) {
      dbUpdates.slug = payload.updates.slug ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "excerpt")) {
      dbUpdates.excerpt = payload.updates.excerpt ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "category")) {
      dbUpdates.category = payload.updates.category ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "tags")) {
      dbUpdates.tags = payload.updates.tags ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "readState")) {
      dbUpdates.read_state = payload.updates.readState ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "notes")) {
      dbUpdates.notes = payload.updates.notes ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload.updates, "featuredImage")) {
      const value = payload.updates.featuredImage
      dbUpdates.featured_image = value && typeof value === "object" ? value : null
    }

    const { data: existing, error: existingError } = await supabase
      .from("bookmarks")
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .eq("user_id", userId)
      .eq("post_id", payload.postId)
      .maybeSingle()

    if (existingError) {
      throw new ActionError("Failed to load bookmark", { cause: existingError })
    }

    if (!existing) {
      throw new ActionError("Bookmark not found", { status: 404 })
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(dbUpdates)
      .eq("user_id", userId)
      .eq("post_id", payload.postId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      throw new ActionError("Failed to update bookmark", { cause: error })
    }

    const updated = data as BookmarkListRow
    const edition =
      typeof updated.country === "string"
        ? updated.country
        : typeof payload.updates.country === "string"
          ? payload.updates.country
          : (existing as BookmarkListRow).country ?? null

    await revalidateBookmarkCache(userId, [edition])

    return {
      updated: [updated],
      statsDelta: computeStatsDelta({
        previous: existing as BookmarkListRow,
        next: updated,
      }),
    }
  })
}

export async function markRead(postId: string): Promise<ActionResult<BookmarkMutationPayload>> {
  return updateBookmark({ postId, updates: { readState: "read" } })
}

export async function markUnread(postId: string): Promise<ActionResult<BookmarkMutationPayload>> {
  return updateBookmark({ postId, updates: { readState: "unread" } })
}

export async function exportBookmarks(): Promise<ActionResult<string>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    const { data, error } = await supabase
      .from("bookmarks")
      .select(BOOKMARK_EXPORT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new ActionError("Failed to export bookmarks", { cause: error })
    }

    const bookmarks = (data ?? []) as Pick<
      BookmarkRow,
      "title" | "slug" | "excerpt" | "createdAt" | "category" | "tags" | "readState" | "notes"
    >[]

    const exportData = {
      exported_at: new Date().toISOString(),
      total_bookmarks: bookmarks.length,
      bookmarks: bookmarks.map((bookmark) => ({
        title: bookmark.title,
        slug: bookmark.slug,
        excerpt: bookmark.excerpt,
        created_at: bookmark.createdAt,
        category: bookmark.category,
        tags: bookmark.tags,
        read_state: bookmark.readState,
        notes: bookmark.notes,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  })
}
