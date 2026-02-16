"use server"

import { revalidateTag } from "next/cache"

import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import { withSupabaseSession } from "@/app/actions/supabase"
import {
  type BookmarkListPayload,
  type BookmarkListRow,
  type BookmarkMutationPayload,
  type BookmarkRow,
  type BookmarkTableRow,
} from "@/types/bookmarks"
import { type BookmarkUpdateInput } from "@/lib/bookmarks/mutations"
import { invalidateBookmarksCache } from "@/lib/bookmarks/cache"
import {
  addBookmarkForUser,
  bulkRemoveBookmarksForUser,
  listBookmarksForUser,
  removeBookmarkForUser,
  updateBookmarkForUser,
} from "@/lib/bookmarks/service"
import {
  buildBookmarkUpdateInput,
  sanitizeCollectionId,
  sanitizeEditionCode,
  sanitizeFeaturedImage,
  sanitizeNoteValue,
  sanitizeNullableCategory,
  sanitizeReadState,
  sanitizeStringArray,
} from "@/lib/bookmarks/validators"

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
  note?: string | null
  notes?: string | null
  readState?: BookmarkRow["readState"] | null
  status?: BookmarkRow["readState"] | null
  editionCode?: BookmarkRow["editionCode"] | null
  collectionId?: BookmarkRow["collectionId"] | null
}

export interface UpdateBookmarkInput {
  postId: string
  updates: BookmarkUpdateInput
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

export async function listBookmarks(
  options: ListBookmarksOptions = {},
): Promise<ActionResult<BookmarkListPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    if (options.revalidate) {
      invalidateBookmarksCache(revalidateTag, { userId })
    }

    return listBookmarksForUser(supabase, userId, {
      limit: Number.MAX_SAFE_INTEGER,
      sortBy: "created_at",
      sortOrder: "desc",
      includeStatsOnCursor: true,
    })
  })
}

export async function addBookmark(
  payload: AddBookmarkInput,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)

    return addBookmarkForUser(
      supabase,
      userId,
      {
        postId: payload.postId,
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt,
        featuredImage: sanitizeFeaturedImage(payload.featuredImage),
        category: sanitizeNullableCategory(payload.category),
        tags: sanitizeStringArray(payload.tags),
        note: sanitizeNoteValue(payload.note ?? payload.notes),
        readState: sanitizeReadState(payload.readState ?? payload.status) ?? null,
        editionCode: sanitizeEditionCode(payload.editionCode),
        collectionId: sanitizeCollectionId(payload.collectionId),
      },
      { revalidate: revalidateTag },
    )
  })
}

export async function removeBookmark(
  postId: string,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)
    return removeBookmarkForUser(supabase, userId, postId, { revalidate: revalidateTag })
  })
}

export async function bulkRemoveBookmarks(
  payload: BulkRemoveInput,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)
    return bulkRemoveBookmarksForUser(supabase, userId, payload.postIds, { revalidate: revalidateTag })
  })
}

export async function updateBookmark(
  payload: UpdateBookmarkInput,
): Promise<ActionResult<BookmarkMutationPayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = ensureUserId(session)
    const updates = buildBookmarkUpdateInput(payload.updates)

    if (!updates) {
      throw new ActionError("Updates payload is required", { status: 400 })
    }

    return updateBookmarkForUser(supabase, userId, payload.postId, updates, { revalidate: revalidateTag })
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
      BookmarkTableRow,
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
