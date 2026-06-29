import { type NextRequest } from "next/server"

import { ActionError } from "@/lib/supabase/action-result"
import { revalidateByTag } from "@/lib/server-cache-utils"
import {
  addBookmarkForUser,
  bulkRemoveBookmarksForUser,
  listBookmarksForUser,
  updateBookmarkForUser,
} from "@/lib/bookmarks/service"
import {
  buildBookmarkUpdateInput,
  extractMutationPayload,
  resolveSortColumn,
  sanitizeCollectionId,
  sanitizeEditionCode,
  sanitizeFeaturedImage,
  sanitizeNoteValue,
  sanitizeNullableCategory,
  sanitizeReadState,
  sanitizeStringArray,
} from "@/lib/bookmarks/validators"
import { makeRoute, routeData, routeError } from "@/lib/api/route-helpers"

export const runtime = "nodejs"
export const revalidate = 60

const EDITION_COOKIE_KEYS = ["country", "preferredCountry"] as const

type SortOrder = "asc" | "desc"
type SortBy = ReturnType<typeof resolveSortColumn>

type CursorInput = {
  sortBy: SortBy
  sortOrder: SortOrder
  value: string | number
  id: string
}

const USER_ROUTE = makeRoute({ auth: "user" })

function toActionError(error: unknown, fallbackMessage: string) {
  return error instanceof ActionError ? error : new ActionError(fallbackMessage, { cause: error })
}

function getRequestEditionPreferences(request: NextRequest): string[] {
  const editions = new Set<string>()

  for (const key of EDITION_COOKIE_KEYS) {
    const value = request.cookies.get(key)?.value
    if (typeof value === "string" && value.trim()) {
      editions.add(value.trim())
    }
  }

  return Array.from(editions)
}

function parseCursor(value: string | null, fallbackSortBy: SortBy): CursorInput | null {
  if (!value) return null

  try {
    const decoded = JSON.parse(decodeURIComponent(value))
    if (!decoded || typeof decoded !== "object") return null

    const parsed = decoded as Record<string, unknown>

    const cursorSortBy = resolveSortColumn(
      typeof parsed.sortBy === "string" ? parsed.sortBy : String(fallbackSortBy),
    ) as SortBy

    const cursorSortOrder: SortOrder = parsed.sortOrder === "asc" ? "asc" : "desc"

    const cursorValue =
      typeof parsed.value === "string" || typeof parsed.value === "number" ? parsed.value : null
    const cursorId = typeof parsed.id === "string" ? parsed.id : null

    if (cursorValue === null || !cursorId) return null

    return {
      sortBy: cursorSortBy,
      sortOrder: cursorSortOrder,
      value: cursorValue,
      id: cursorId,
    }
  } catch (error) {
    console.warn("Failed to decode bookmark cursor", error)
    return null
  }
}

export const GET = USER_ROUTE(async ({ request, supabase, session }) => {
  try {
    const { searchParams } = new URL(request.url)

    const sortBy = resolveSortColumn(searchParams.get("sortBy")) as SortBy
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc"

    const listPayload = await listBookmarksForUser(supabase!, session!.user.id, {
      limit: Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      search: searchParams.get("search"),
      category: searchParams.get("category"),
      readState: searchParams.get("readState") ?? searchParams.get("status"),
      sortOrder,
      sortBy,
      cursor: parseCursor(searchParams.get("cursor"), sortBy),
      postId: searchParams.get("postId") ?? searchParams.get("wpPostId") ?? searchParams.get("wp_post_id"),
      editionCode: searchParams.get("editionCode") ?? searchParams.get("edition_code") ?? searchParams.get("country"),
      collectionId: searchParams.get("collectionId") ?? searchParams.get("collection_id"),
    })

    return routeData(listPayload)
  } catch (error) {
    const actionError = toActionError(error, "Internal server error")
    return routeError(actionError.message || "Internal server error", { status: actionError.status ?? 500 })
  }
})

export const POST = USER_ROUTE(async ({ request, supabase, session }) => {
  try {
    const body = await request.json()
    const payload = extractMutationPayload(body)

    if (!payload) {
      return routeError("Invalid bookmark payload", { status: 400 })
    }

    const mutationPayload = await addBookmarkForUser(
      supabase!,
      session!.user.id,
      {
        postId: typeof payload.postId === "string" ? payload.postId.trim() : "",
        title: typeof payload.title === "string" ? payload.title : undefined,
        slug: typeof payload.slug === "string" ? payload.slug : undefined,
        excerpt: typeof payload.excerpt === "string" ? payload.excerpt : undefined,
        featuredImage: sanitizeFeaturedImage(payload.featuredImage),
        category: sanitizeNullableCategory(payload.category),
        tags: sanitizeStringArray(payload.tags),
        note: sanitizeNoteValue(payload.note ?? payload.notes),
        readState: sanitizeReadState(payload.readState ?? payload.status) ?? null,
        editionCode: sanitizeEditionCode(payload.editionCode ?? payload.country),
        collectionId: sanitizeCollectionId(payload.collectionId),
      },
      { revalidate: revalidateByTag, editionHints: getRequestEditionPreferences(request) },
    )

    return routeData(mutationPayload)
  } catch (error) {
    const actionError = toActionError(error, "Failed to add bookmark")
    return routeError(actionError.message || "Failed to add bookmark", { status: actionError.status ?? 500 })
  }
})

export const PUT = USER_ROUTE(async ({ request, supabase, session }) => {
  try {
    const body = await request.json()
    const payload = extractMutationPayload(body)

    if (!payload) {
      return routeError("Invalid bookmark payload", { status: 400 })
    }

    const updates = buildBookmarkUpdateInput(payload.updates)
    if (!updates) {
      return routeError("Updates payload is required", { status: 400 })
    }

    const mutationPayload = await updateBookmarkForUser(
      supabase!,
      session!.user.id,
      typeof payload.postId === "string" ? payload.postId.trim() : "",
      updates,
      { revalidate: revalidateByTag, editionHints: getRequestEditionPreferences(request) },
    )

    return routeData(mutationPayload)
  } catch (error) {
    const actionError = toActionError(error, "Failed to update bookmark")
    return routeError(actionError.message || "Failed to update bookmark", { status: actionError.status ?? 500 })
  }
})

export const DELETE = USER_ROUTE(async ({ request, supabase, session }) => {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")
    const postIds = searchParams.get("postIds")?.split(",").filter(Boolean)

    if (!postId && (!postIds || postIds.length === 0)) {
      return routeError("Post ID(s) required", { status: 400 })
    }

    const ids = postIds?.length ? postIds : [postId ?? ""]

    const mutationPayload = await bulkRemoveBookmarksForUser(supabase!, session!.user.id, ids, {
      revalidate: revalidateByTag,
      editionHints: getRequestEditionPreferences(request),
    })

    return routeData(mutationPayload)
  } catch (error) {
    const actionError = toActionError(error, "Failed to remove bookmark(s)")
    return routeError(actionError.message || "Failed to remove bookmark(s)", { status: actionError.status ?? 500 })
  }
})
