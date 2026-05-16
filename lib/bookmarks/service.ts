import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/types/supabase"
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

function toJsonObject(value: Record<string, unknown> | null | undefined): Json | null {
  return value ? (value as Json) : null
}

function parseWpPostId(value: string, fieldName = "Post ID"): number {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) {
    throw new ActionError(`${fieldName} must be a numeric WordPress post ID`, { status: 400 })
  }

  const parsed = Number(normalized)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ActionError(`${fieldName} must be a valid WordPress post ID`, { status: 400 })
  }

  return parsed
}

function parseWpPostIds(values: string[]): number[] {
  const parsed = values.map((value) => parseWpPostId(value))
  return [...new Set(parsed)]
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

  const { data: rows, error } = await executeListQuery(supabase, "bookmarks", async (query) => {
    let builder = query.select(BOOKMARK_LIST_SELECT_COLUMNS).eq("user_id", userId)

    const searchTerm = typeof input.search === "string" ? input.search.trim() : ""
    if (searchTerm) {
      const escapedSearch = searchTerm.replace(/,/g, "\\,")
      const searchFilters = [
        `title.ilike.%${escapedSearch}%`,
        `excerpt.ilike.%${escapedSearch}%`,
        `note.ilike.%${escapedSearch}%`,
        `edition_code.ilike.%${escapedSearch}%`,
        `collection_id.ilike.%${escapedSearch}%`,
      ]

      if (/^\d+$/.test(searchTerm)) {
        searchFilters.push(`wp_post_id.eq.${Number(searchTerm)}`)
      }

      builder = builder.or(searchFilters.join(","))
    }

    if (input.category && input.category !== "all") {
      builder = builder.eq("category", input.category)
    }

    if (input.postId && input.postId.trim().length) {
      builder = builder.eq("wp_post_id", parseWpPostId(input.postId))
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
    rows: (rows ?? []) as unknown as BookmarkListRow[],
    cursorEncoder: (row) => {
      const sortAlias = SORTABLE_COLUMNS[sortColumn]?.alias ?? sortColumn
      const sortValue =
        (row as Record<string, unknown>)[sortAlias] ??
        (row as Record<string, unknown>)[sortColumn] ??
        null
      return {
        sortBy: sortColumn,
        sortOrder,
        value: typeof sortValue === "string" || typeof sortValue === "number" ? sortValue : null,
        id: row.id,
      }
    },
  })

  let stats = input.includeStatsOnCursor || !cursor ? await fetchBookmarkStats(supabase, userId) : null
  if (!stats) {
    stats = getDefaultBookmarkStats()
  }

  return {
    bookmarks,
    stats,
    pagination,
  }
}

export async function addBookmarkForUser(
  supabase: BookmarkSupabaseClient,
  userId: string,
  input: {
    postId: string
    title?: string | null
    slug?: string | null
    excerpt?: string | null
    featuredImage?: Record<string, unknown> | null
    category?: string | null
    tags?: string[] | null
    note?: string | null
    readState?: string | null
    editionCode?: string | null
    collectionId?: string | null
  },
  options: ServiceMutationOptions = {},
): Promise<BookmarkMutationPayload> {
  const postId = parseWpPostId(input.postId)
  const editionCode = sanitizeEditionCode(input.editionCode) ?? "sz"
  const collectionId = await ensureBookmarkCollectionAssignment(supabase, userId, {
    editionCode,
    collectionId: sanitizeCollectionId(input.collectionId),
  })

  const insertPayload: Database["public"]["Tables"]["bookmarks"]["Insert"] = {
    user_id: userId,
    wp_post_id: postId,
    title: input.title ?? null,
    slug: input.slug ?? null,
    excerpt: input.excerpt ?? null,
    featured_image: toJsonObject(input.featuredImage),
    category: input.category ?? null,
    tags: input.tags ?? null,
    note: input.note ?? null,
    read_state: sanitizeReadState(input.readState) ?? "unread",
    edition_code: editionCode,
    collection_id: collectionId,
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .upsert(insertPayload, { onConflict: "user_id,wp_post_id,edition_code" })
    .select(BOOKMARK_LIST_SELECT_COLUMNS)
    .single()

  if (error) {
    throw new ActionError("Failed to add bookmark", { cause: error })
  }

  const row = data as unknown as BookmarkListRow
  await applyBookmarkCounterDelta(supabase, userId, buildAdditionCounterDelta(row))
  invalidateBookmarksCache(options.revalidate, { userId, postId: input.postId, editionCodes: [editionCode, ...(options.editionHints ?? [])] })

  return computeStatsDelta({ added: [row] })
}

export async function removeBookmarkForUser(
  supabase: BookmarkSupabaseClient,
  userId: string,
  postIdValue: string,
  options: ServiceMutationOptions = {},
): Promise<BookmarkMutationPayload> {
  const postId = parseWpPostId(postIdValue)
  const { data: existingRows, error: selectError } = await supabase
    .from("bookmarks")
    .select(BOOKMARK_LIST_SELECT_COLUMNS)
    .eq("user_id", userId)
    .eq("wp_post_id", postId)

  if (selectError) {
    throw new ActionError("Failed to lookup bookmark", { cause: selectError })
  }

  const existing = (existingRows ?? []) as unknown as BookmarkListRow[]

  const { error } = await supabase.from("bookmarks").delete().eq("user_id", userId).eq("wp_post_id", postId)

  if (error) {
    throw new ActionError("Failed to remove bookmark", { cause: error })
  }

  await applyBookmarkCounterDelta(supabase, userId, buildRemovalCounterDelta(existing))
  invalidateBookmarksCache(options.revalidate, { userId, postId: postIdValue, editionCodes: [...new Set(existing.map((row) => row.editionCode))] })

  return computeStatsDelta({ removed: existing })
}
