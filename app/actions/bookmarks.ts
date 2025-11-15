"use server"

import { revalidateTag } from "next/cache"

import { cacheTags } from "@/lib/cache"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import { withSupabaseSession, type SupabaseServerClient } from "@/app/actions/supabase"
import { ensureBookmarkCollectionAssignment } from "@/lib/bookmarks/collections"
import { applyBookmarkCounterDelta } from "@/lib/bookmarks/counters"
import {
  buildAdditionCounterDelta,
  buildRemovalCounterDelta,
  buildUpdateCounterDelta,
} from "@/lib/bookmarks/mutations"
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
  type BookmarkTableRow,
  type BookmarkListPayload,
  type BookmarkListRow,
  type BookmarkMutationPayload,
  type BookmarkRow,
} from "@/types/bookmarks"

type BookmarkInsert = Database["public"]["Tables"]["bookmarks"]["Insert"]
export type {
  BookmarkListPayload,
  BookmarkListRow,
  BookmarkPagination,
  BookmarkMutationPayload,
  BookmarkReadState,
  BookmarkRow,
  BookmarkStats,
  BookmarkStatsDelta,
} from "@/types/bookmarks"

const BOOKMARK_EXPORT_COLUMNS =
  "title, slug, excerpt, created_at, category, tags, read_state, note, edition_code, collection_id"

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
  collectionId?: BookmarkRow["collectionId"] | null
}

export interface UpdateBookmarkInput {
  postId: string
  updates: Partial<
    Omit<
      BookmarkRow,
      | "id"
      | "userId"
      | "postId"
      | "createdAt"
      | "editionCode"
      | "collectionId"
    >
  >
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
    const wpPostId = payload.postId
    const editionCodeInput = payload.country ?? null
    const requestedCollectionId = payload.collectionId ?? null

    if (!wpPostId) {
      throw new ActionError("Post ID is required", { status: 400 })
    }

    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("wp_post_id", wpPostId)
      .maybeSingle()

    if (existing) {
      throw new ActionError("Bookmark already exists", { status: 409 })
    }

    let resolvedCollectionId: string | null = null
    try {
      resolvedCollectionId = await ensureBookmarkCollectionAssignment(supabase, {
        userId,
        collectionId: requestedCollectionId,
        editionCode: editionCodeInput,
      })
    } catch (collectionError) {
      throw new ActionError("Failed to resolve bookmark collection", { cause: collectionError })
    }

    const newBookmark: BookmarkInsert = {
      user_id: userId,
      wp_post_id: wpPostId,
      edition_code: editionCodeInput,
      collection_id: resolvedCollectionId,
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
      note: payload.notes ?? null,
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
    const editionCode = typeof inserted.country === "string" ? inserted.country : editionCodeInput

    const additionDelta = buildAdditionCounterDelta(inserted)
    if (additionDelta) {
      try {
        await applyBookmarkCounterDelta(supabase, { userId, delta: additionDelta })
      } catch (counterError) {
        throw new ActionError("Failed to update bookmark counters", { cause: counterError })
      }
    }

    await revalidateBookmarkCache(userId, [editionCode])

    return {
      added: [inserted],
      statsDelta: computeStatsDelta({ next: inserted }),
    }
  })
}

export async function removeBookmark(
  wpPostId: string,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (!wpPostId) {
      throw new ActionError("Post ID is required", { status: 400 })
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("wp_post_id", wpPostId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)

    if (error) {
      throw new ActionError("Failed to remove bookmark", { cause: error })
    }

    const removedRows = (data ?? []) as BookmarkListRow[]
    const removalDelta = buildRemovalCounterDelta(removedRows)
    if (removalDelta) {
      try {
        await applyBookmarkCounterDelta(supabase, { userId, delta: removalDelta })
      } catch (counterError) {
        throw new ActionError("Failed to update bookmark counters", { cause: counterError })
      }
    }

    await revalidateBookmarkCache(userId, removedRows.map((row) => row.country ?? null))
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
      .in("wp_post_id", payload.postIds)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)

    if (error) {
      throw new ActionError("Failed to remove bookmarks", { cause: error })
    }

    const removedRows = (data ?? []) as BookmarkListRow[]
    const removalDelta = buildRemovalCounterDelta(removedRows)
    if (removalDelta) {
      try {
        await applyBookmarkCounterDelta(supabase, { userId, delta: removalDelta })
      } catch (counterError) {
        throw new ActionError("Failed to update bookmark counters", { cause: counterError })
      }
    }

    await revalidateBookmarkCache(userId, removedRows.map((row) => row.country ?? null))
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
    const wpPostId = payload.postId
    const { data: existing, error: existingError } = await supabase
      .from("bookmarks")
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .eq("user_id", userId)
      .eq("wp_post_id", wpPostId)
      .maybeSingle()

    if (existingError) {
      throw new ActionError("Failed to load bookmark", { cause: existingError })
    }

    if (!existing) {
      throw new ActionError("Bookmark not found", { status: 404 })
    }

    const existingRow = existing as BookmarkListRow
    const dbUpdates: Database["public"]["Tables"]["bookmarks"]["Update"] = {}
    const updates = payload.updates

    const hasEditionUpdate = Object.prototype.hasOwnProperty.call(updates, "country")
    const hasCollectionUpdate = Object.prototype.hasOwnProperty.call(updates, "collectionId")
    let targetEditionCode = hasEditionUpdate ? updates.country ?? null : existingRow.country ?? null

    if (hasEditionUpdate) {
      dbUpdates.edition_code = updates.country ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "title")) {
      dbUpdates.title = updates.title ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "slug")) {
      dbUpdates.slug = updates.slug ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "excerpt")) {
      dbUpdates.excerpt = updates.excerpt ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "category")) {
      dbUpdates.category = updates.category ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "tags")) {
      dbUpdates.tags = updates.tags ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "readState")) {
      dbUpdates.read_state = updates.readState ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "notes")) {
      dbUpdates.note = updates.notes ?? null
    }
    if (Object.prototype.hasOwnProperty.call(updates, "featuredImage")) {
      const value = updates.featuredImage
      dbUpdates.featured_image = value && typeof value === "object" ? value : null
    }

    if (hasCollectionUpdate || hasEditionUpdate) {
      try {
        const resolvedCollectionId = await ensureBookmarkCollectionAssignment(supabase, {
          userId,
          collectionId: hasCollectionUpdate ? updates.collectionId ?? null : existingRow.collectionId ?? null,
          editionCode: targetEditionCode,
        })
        dbUpdates.collection_id = resolvedCollectionId
      } catch (collectionError) {
        throw new ActionError("Failed to resolve bookmark collection", { cause: collectionError })
      }
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(dbUpdates)
      .eq("user_id", userId)
      .eq("wp_post_id", wpPostId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      throw new ActionError("Failed to update bookmark", { cause: error })
    }

    const updated = data as BookmarkListRow
    const editionCode = updated.country ?? targetEditionCode ?? existingRow.country ?? null
    const counterDelta = buildUpdateCounterDelta(existingRow, updated)
    if (counterDelta) {
      try {
        await applyBookmarkCounterDelta(supabase, { userId, delta: counterDelta })
      } catch (counterError) {
        throw new ActionError("Failed to update bookmark counters", { cause: counterError })
      }
    }

    await revalidateBookmarkCache(userId, [editionCode])

    return {
      updated: [updated],
      statsDelta: computeStatsDelta({
        previous: existingRow,
        next: updated,
      }),
    }
  })
}

export async function markRead(wpPostId: string): Promise<ActionResult<BookmarkMutationPayload>> {
  return updateBookmark({ postId: wpPostId, updates: { readState: "read" } })
}

export async function markUnread(wpPostId: string): Promise<ActionResult<BookmarkMutationPayload>> {
  return updateBookmark({ postId: wpPostId, updates: { readState: "unread" } })
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
      BookmarkTableRow,
      | "title"
      | "slug"
      | "excerpt"
      | "createdAt"
      | "category"
      | "tags"
      | "readState"
      | "notes"
      | "country"
      | "collectionId"
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
        note: bookmark.notes,
        edition_code: bookmark.country,
        collection_id: bookmark.collectionId,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  })
}
