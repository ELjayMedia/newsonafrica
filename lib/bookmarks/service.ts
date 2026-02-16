import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"
import {
  BOOKMARK_LIST_SELECT_COLUMNS,
  type BookmarkListPayload,
  type BookmarkListRow,
  type BookmarkMutationPayload,
} from "@/types/bookmarks"
import { ActionError } from "@/lib/supabase/action-result"
import { derivePagination } from "@/lib/bookmarks/pagination"
import { executeListQuery } from "@/lib/supabase/list-query"
import { fetchBookmarkStats, getDefaultBookmarkStats } from "@/lib/bookmarks/stats"
import { ensureBookmarkCollectionAssignment } from "@/lib/bookmarks/collections"
import { applyBookmarkCounterDelta } from "@/lib/bookmarks/counters"
import {
  buildAdditionCounterDelta,
  buildRemovalCounterDelta,
  buildUpdateCounterDelta,
  prepareBookmarkUpdatePayload,
  type BookmarkUpdateInput,
} from "@/lib/bookmarks/mutations"
import { combineStatsDeltas, computeStatsDelta } from "@/lib/bookmarks/mutation-delta"
import { invalidateBookmarksCache } from "@/lib/bookmarks/cache"
import {
  resolveSortColumn,
  sanitizeCollectionId,
  sanitizeEditionCode,
  sanitizeReadState,
  type SortColumn,
  SORTABLE_COLUMNS,
} from "@/lib/bookmarks/validators"

type BookmarkSupabaseClient = SupabaseClient<Database>

interface CursorInput {
  sortBy: SortColumn
  sortOrder: "asc" | "desc"
  value: string | number | null
  id: string | null
}

export interface ListBookmarksInput {
  limit?: number
  search?: string | null
  category?: string | null
  readState?: string | null
  sortBy?: string | null
  sortOrder?: "asc" | "desc"
  cursor?: CursorInput | null
  postId?: string | null
  editionCode?: string | null
  collectionId?: string | null
  includeStatsOnCursor?: boolean
}

interface ServiceMutationOptions {
  revalidate?: (tag: string) => void
  editionHints?: Iterable<string | null | undefined>
}

export async function listBookmarksForUser(
  supabase: BookmarkSupabaseClient,
  userId: string,
  input: ListBookmarksInput = {},
): Promise<BookmarkListPayload> {
  const limit = Math.max(input.limit ?? 20, 1)
  const sortOrder = input.sortOrder === "asc" ? "asc" : "desc"
  const sortColumn = resolveSortColumn(input.sortBy ?? null)
  const cursor = input.cursor ?? null
  const ascending = sortOrder === "asc"

  const { data: rows, error } = await executeListQuery(supabase, "bookmarks", (query) => {
    let builder = query.select(BOOKMARK_LIST_SELECT_COLUMNS).eq("user_id", userId)

    const searchTerm = typeof input.search === "string" ? input.search.trim() : ""
    if (searchTerm) {
      const escapedSearch = searchTerm.replace(/,/g, "\\,")
      builder = builder.or(
        [
          `title.ilike.%${escapedSearch}%`,
          `excerpt.ilike.%${escapedSearch}%`,
          `note.ilike.%${escapedSearch}%`,
          `wp_post_id.ilike.%${escapedSearch}%`,
          `edition_code.ilike.%${escapedSearch}%`,
          `collection_id.ilike.%${escapedSearch}%`,
        ].join(","),
      )
    }

    if (input.category && input.category !== "all") {
      builder = builder.eq("category", input.category)
    }

    if (input.postId && input.postId.trim().length) {
      builder = builder.eq("wp_post_id", input.postId.trim())
    }

    if (input.editionCode && input.editionCode !== "all") {
      const editionFilter = sanitizeEditionCode(input.editionCode)
      if (editionFilter === null) {
        builder = builder.is("edition_code", null)
      } else if (editionFilter) {
        builder = builder.eq("edition_code", editionFilter)
      }
    }

    if (input.collectionId) {
      const collectionFilter = sanitizeCollectionId(input.collectionId)
      if (collectionFilter === null) {
        builder = builder.is("collection_id", null)
      } else if (collectionFilter) {
        builder = builder.eq("collection_id", collectionFilter)
      }
    }

    if (input.readState && input.readState !== "all") {
      const normalizedReadState = sanitizeReadState(input.readState)
      if (normalizedReadState === null) {
        builder = builder.is("read_state", null)
      } else if (normalizedReadState) {
        builder = builder.eq("read_state", normalizedReadState)
      } else if (input.readState === "unread") {
        builder = builder.or("read_state.eq.unread,read_state.eq.in_progress,read_state.is.null")
      }
    }

    builder = builder.order(sortColumn, { ascending }).order("id", { ascending })

    if (cursor && cursor.sortBy === sortColumn && cursor.sortOrder === sortOrder && cursor.value !== null && cursor.id) {
      const comparator = ascending ? "gt" : "lt"
      const idComparator = ascending ? "gt" : "lt"
      builder = builder.or(
        [
          `${cursor.sortBy}.${comparator}.${cursor.value}`,
          `and(${cursor.sortBy}.eq.${cursor.value},id.${idComparator}.${cursor.id})`,
        ].join(","),
      )
    }

    return builder.limit(limit + 1)
  })

  if (error) {
    throw new ActionError("Failed to fetch bookmarks", { cause: error })
  }

  const { items: bookmarks, pagination } = derivePagination<BookmarkListRow>({
    limit,
    rows: (rows ?? []) as BookmarkListRow[],
    cursorEncoder: (row) => {
      const sortAlias = SORTABLE_COLUMNS[sortColumn]?.alias ?? sortColumn
      const sortValue =
        (row as Record<string, unknown>)[sortAlias] ??
        (row as Record<string, unknown>)[sortColumn] ??
        null
      try {
        return JSON.stringify({ sortBy: sortColumn, sortOrder, value: sortValue, id: row.id ?? null })
      } catch {
        return null
      }
    },
  })

  let stats = null
  const shouldFetchStats = input.includeStatsOnCursor ? true : !cursor
  if (shouldFetchStats) {
    try {
      stats = bookmarks.length ? await fetchBookmarkStats(supabase, userId) : getDefaultBookmarkStats()
    } catch {
      stats = getDefaultBookmarkStats()
    }
  }

  return { bookmarks, stats, pagination }
}

interface AddBookmarkInput {
  postId: string
  title?: string
  slug?: string
  excerpt?: string
  featuredImage?: Record<string, unknown> | null
  category?: string | null
  tags?: string[] | null
  note?: string | null
  readState?: string | null
  editionCode?: string | null
  collectionId?: string | null
}

export async function addBookmarkForUser(
  supabase: BookmarkSupabaseClient,
  userId: string,
  payload: AddBookmarkInput,
  options: ServiceMutationOptions = {},
): Promise<BookmarkMutationPayload> {
  if (!payload.postId?.trim()) {
    throw new ActionError("Post ID is required", { status: 400 })
  }

  const postId = payload.postId.trim()
  const editionCodeInput = sanitizeEditionCode(payload.editionCode) ?? null

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("wp_post_id", postId)
    .maybeSingle()

  if (existing) {
    throw new ActionError("Bookmark already exists", { status: 409 })
  }

  let resolvedCollectionId: string | null = null
  try {
    resolvedCollectionId = await ensureBookmarkCollectionAssignment(supabase, {
      userId,
      collectionId: sanitizeCollectionId(payload.collectionId) ?? null,
      editionCode: editionCodeInput,
    })
  } catch (error) {
    throw new ActionError("Failed to resolve bookmark collection", { cause: error })
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: userId,
      wp_post_id: postId,
      edition_code: editionCodeInput,
      collection_id: resolvedCollectionId,
      title: payload.title ?? "Untitled Post",
      slug: payload.slug ?? "",
      excerpt: payload.excerpt ?? "",
      featured_image: payload.featuredImage ?? null,
      category: payload.category ?? null,
      tags: payload.tags ?? null,
      read_state: sanitizeReadState(payload.readState) ?? "unread",
      note: payload.note ?? null,
    })
    .select(BOOKMARK_LIST_SELECT_COLUMNS)
    .single()

  if (error) {
    throw new ActionError("Failed to add bookmark", { cause: error })
  }

  const inserted = data as BookmarkListRow
  try {
    await applyBookmarkCounterDelta(supabase, { userId, delta: buildAdditionCounterDelta(inserted) })
  } catch (error) {
    throw new ActionError("Failed to update bookmark counters", { cause: error })
  }

  if (options.revalidate) {
    invalidateBookmarksCache(options.revalidate, {
      userId,
      editions: [inserted.editionCode ?? editionCodeInput, ...(options.editionHints ?? [])],
      collections: [inserted.collectionId ?? resolvedCollectionId ?? null],
    })
  }

  return { added: [inserted], statsDelta: computeStatsDelta({ next: inserted }) }
}

export async function updateBookmarkForUser(
  supabase: BookmarkSupabaseClient,
  userId: string,
  postId: string,
  updates: BookmarkUpdateInput,
  options: ServiceMutationOptions = {},
): Promise<BookmarkMutationPayload> {
  if (!postId?.trim()) {
    throw new ActionError("Post ID is required", { status: 400 })
  }

  const { data: existing, error: existingError } = await supabase
    .from("bookmarks")
    .select(BOOKMARK_LIST_SELECT_COLUMNS)
    .eq("user_id", userId)
    .eq("wp_post_id", postId)
    .maybeSingle()

  if (existingError) {
    throw new ActionError("Failed to load bookmark", { cause: existingError })
  }

  if (!existing) {
    throw new ActionError("Bookmark not found", { status: 404 })
  }

  const existingRow = existing as BookmarkListRow
  const preparation = prepareBookmarkUpdatePayload(existingRow, updates ?? {})
  if (!preparation.hasWritableUpdate) {
    throw new ActionError("No bookmark updates provided", { status: 400 })
  }

  if (preparation.shouldResolveCollection) {
    try {
      preparation.dbUpdates.collection_id = await ensureBookmarkCollectionAssignment(supabase, {
        userId,
        collectionId: preparation.targetCollectionId,
        editionCode: preparation.targetEditionCode,
      })
    } catch (error) {
      throw new ActionError("Failed to resolve bookmark collection", { cause: error })
    }
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .update(preparation.dbUpdates)
    .eq("user_id", userId)
    .eq("wp_post_id", postId)
    .select(BOOKMARK_LIST_SELECT_COLUMNS)
    .single()

  if (error) {
    throw new ActionError("Failed to update bookmark", { cause: error })
  }

  const updated = data as BookmarkListRow
  const counterDelta = buildUpdateCounterDelta(existingRow, updated)
  if (counterDelta) {
    try {
      await applyBookmarkCounterDelta(supabase, { userId, delta: counterDelta })
    } catch (counterError) {
      throw new ActionError("Failed to update bookmark counters", { cause: counterError })
    }
  }

  if (options.revalidate) {
    invalidateBookmarksCache(options.revalidate, {
      userId,
      editions: [existingRow.editionCode ?? null, updated.editionCode ?? preparation.targetEditionCode ?? null, ...(options.editionHints ?? [])],
      collections: [existingRow.collectionId ?? null, updated.collectionId ?? preparation.targetCollectionId ?? null],
    })
  }

  return {
    updated: [updated],
    statsDelta: computeStatsDelta({ previous: existingRow, next: updated }),
  }
}

export async function removeBookmarkForUser(
  supabase: BookmarkSupabaseClient,
  userId: string,
  postId: string,
  options: ServiceMutationOptions = {},
): Promise<BookmarkMutationPayload> {
  return bulkRemoveBookmarksForUser(supabase, userId, [postId], options)
}

export async function bulkRemoveBookmarksForUser(
  supabase: BookmarkSupabaseClient,
  userId: string,
  postIds: string[],
  options: ServiceMutationOptions = {},
): Promise<BookmarkMutationPayload> {
  const filteredPostIds = postIds.map((id) => id.trim()).filter(Boolean)
  if (!filteredPostIds.length) {
    throw new ActionError("Post IDs are required", { status: 400 })
  }

  let query = supabase.from("bookmarks").delete().eq("user_id", userId)
  query = filteredPostIds.length === 1 ? query.eq("wp_post_id", filteredPostIds[0]) : query.in("wp_post_id", filteredPostIds)

  const { data, error } = await query.select(BOOKMARK_LIST_SELECT_COLUMNS)

  if (error) {
    throw new ActionError(filteredPostIds.length === 1 ? "Failed to remove bookmark" : "Failed to remove bookmarks", { cause: error })
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

  if (options.revalidate) {
    invalidateBookmarksCache(options.revalidate, {
      userId,
      editions: [...removedRows.map((row) => row.editionCode ?? null), ...(options.editionHints ?? [])],
      collections: removedRows.map((row) => row.collectionId ?? null),
    })
  }

  return {
    removed: removedRows,
    statsDelta: combineStatsDeltas(removedRows.map((row) => computeStatsDelta({ previous: row }))),
  }
}
