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
import {
  BOOKMARK_LIST_SELECT_COLUMNS,
  type BookmarkListPayload,
  type BookmarkListRow,
  type BookmarkMutationPayload,
  type BookmarkRow,
  type BookmarkStatsDelta,
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
  featuredImage?: BookmarkRow["featured_image"] | null
  category?: string | null
  tags?: string[] | null
  notes?: string | null
  country?: string | null
  collectionId?: BookmarkRow["collection_id"] | null
}

export interface UpdateBookmarkInput {
  postId: string
  updates: Partial<Omit<BookmarkRow, "id" | "user_id" | "wp_post_id" | "created_at">>
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

function createEmptyStatsDelta(): BookmarkStatsDelta {
  return { total: 0, unread: 0, categories: {} }
}

function mergeCategoryDelta(
  accumulator: Record<string, number>,
  category: string | null | undefined,
  delta: number,
): void {
  if (!category) {
    return
  }

  const next = (accumulator[category] ?? 0) + delta
  if (next === 0) {
    delete accumulator[category]
    return
  }

  accumulator[category] = next
}

function computeStatsDelta({
  previous,
  next,
}: {
  previous?: BookmarkListRow | null
  next?: BookmarkListRow | null
}): BookmarkStatsDelta {
  const delta = createEmptyStatsDelta()

  if (previous) {
    delta.total -= 1
    if (previous.read_state !== "read") {
      delta.unread -= 1
    }
    mergeCategoryDelta(delta.categories, previous.category, -1)
  }

  if (next) {
    delta.total += 1
    if (next.read_state !== "read") {
      delta.unread += 1
    }
    mergeCategoryDelta(delta.categories, next.category, 1)
  }

  return delta
}

function combineStatsDeltas(deltas: BookmarkStatsDelta[]): BookmarkStatsDelta {
  return deltas.reduce<BookmarkStatsDelta>((acc, delta) => {
    acc.total += delta.total
    acc.unread += delta.unread

    for (const [category, value] of Object.entries(delta.categories)) {
      mergeCategoryDelta(acc.categories, category, value)
    }

    return acc
  }, createEmptyStatsDelta())
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
    const collectionId = payload.collectionId ?? null

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

    const newBookmark: BookmarkInsert = {
      user_id: userId,
      wp_post_id: wpPostId,
      edition_code: editionCodeInput,
      collection_id: collectionId,
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
    const editionCode =
      typeof inserted.edition_code === "string"
        ? inserted.edition_code
        : editionCodeInput

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
    await revalidateBookmarkCache(
      userId,
      removedRows.map((row) => (typeof row.edition_code === "string" ? row.edition_code : null)),
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
      .in("wp_post_id", payload.postIds)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)

    if (error) {
      throw new ActionError("Failed to remove bookmarks", { cause: error })
    }

    const removedRows = (data ?? []) as BookmarkListRow[]
    await revalidateBookmarkCache(
      userId,
      removedRows.map((row) => (typeof row.edition_code === "string" ? row.edition_code : null)),
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
    const wpPostId = payload.postId
    const sanitizedUpdates: Partial<BookmarkRow> & {
      country?: string | null
      notes?: string | null
      read_status?: BookmarkRow["read_state"] | null
    } = { ...payload.updates }

    if ("featured_image" in sanitizedUpdates) {
      sanitizedUpdates.featured_image =
        sanitizedUpdates.featured_image && typeof sanitizedUpdates.featured_image === "object"
          ? sanitizedUpdates.featured_image
          : null
    }

    if ("country" in sanitizedUpdates) {
      sanitizedUpdates.edition_code =
        typeof sanitizedUpdates.country === "string" ? sanitizedUpdates.country : null
      delete sanitizedUpdates.country
    }

    if ("notes" in sanitizedUpdates) {
      sanitizedUpdates.note = sanitizedUpdates.notes ?? null
      delete sanitizedUpdates.notes
    }

    if ("read_status" in sanitizedUpdates) {
      sanitizedUpdates.read_state = sanitizedUpdates.read_status ?? null
      delete sanitizedUpdates.read_status
    }

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

    const { data, error } = await supabase
      .from("bookmarks")
      .update(sanitizedUpdates)
      .eq("user_id", userId)
      .eq("wp_post_id", wpPostId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      throw new ActionError("Failed to update bookmark", { cause: error })
    }

    const updated = data as BookmarkListRow
    const editionCode =
      typeof updated.edition_code === "string"
        ? updated.edition_code
        : typeof sanitizedUpdates.edition_code === "string"
          ? sanitizedUpdates.edition_code
          : (existing as BookmarkListRow).edition_code ?? null

    await revalidateBookmarkCache(userId, [editionCode])

    return {
      updated: [updated],
      statsDelta: computeStatsDelta({
        previous: existing as BookmarkListRow,
        next: updated,
      }),
    }
  })
}

export async function markRead(wpPostId: string): Promise<ActionResult<BookmarkMutationPayload>> {
  return updateBookmark({ postId: wpPostId, updates: { read_state: "read" } })
}

export async function markUnread(wpPostId: string): Promise<ActionResult<BookmarkMutationPayload>> {
  return updateBookmark({ postId: wpPostId, updates: { read_state: "unread" } })
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
      | "title"
      | "slug"
      | "excerpt"
      | "created_at"
      | "category"
      | "tags"
      | "read_state"
      | "note"
      | "edition_code"
      | "collection_id"
    >[]

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
        read_state: bookmark.read_state,
        note: bookmark.note,
        edition_code: bookmark.edition_code,
        collection_id: bookmark.collection_id,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  })
}
