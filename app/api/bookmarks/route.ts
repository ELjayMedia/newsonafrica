import { type NextRequest, NextResponse } from "next/server"

import { createSupabaseRouteClient } from "@/lib/supabase/route"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { ActionError } from "@/lib/supabase/action-result"
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

export const runtime = "nodejs"
export const revalidate = 60

const EDITION_COOKIE_KEYS = ["country", "preferredCountry"] as const

type SortOrder = "asc" | "desc"

// If you have a concrete union elsewhere, replace `string` with it.
// We keep it compatible with whatever resolveSortColumn returns.
type SortBy = ReturnType<typeof resolveSortColumn>

// Cursor type used by your API/service (based on your decoded object)
type CursorInput = {
  sortBy: SortBy
  sortOrder: SortOrder
  value: string | number
  id: string
}

function serviceUnavailable(request: NextRequest) {
  return jsonWithCors(request, { error: "Supabase service unavailable" }, { status: 503 })
}

function toErrorResponse(request: NextRequest, error: unknown, fallbackMessage: string) {
  const actionError = error instanceof ActionError ? error : new ActionError(fallbackMessage, { cause: error })
  return jsonWithCors(request, { error: actionError.message || fallbackMessage }, { status: actionError.status ?? 500 })
}

function successResponse(
  request: NextRequest,
  respond: <T extends NextResponse>(response: T) => T,
  payload: unknown,
) {
  return respond(jsonWithCors(request, { data: payload, error: null }))
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

export async function GET(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) return serviceUnavailable(request)

  const { supabase, applyCookies } = routeClient
  const respond = <T extends NextResponse>(response: T): T => applyCookies(response)

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return respond(jsonWithCors(request, { error: "Unauthorized" }, { status: 401 }))
    }

    const { searchParams } = new URL(request.url)

    const sortBy = resolveSortColumn(searchParams.get("sortBy")) as SortBy
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc"

    const listPayload = await listBookmarksForUser(supabase, user.id, {
      limit: Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      search: searchParams.get("search"),
      category: searchParams.get("category"),
      readState: searchParams.get("readState") ?? searchParams.get("status"),
      sortOrder,
      sortBy,
      // ✅ now correctly typed as CursorInput | null
      cursor: parseCursor(searchParams.get("cursor"), sortBy),
      postId: searchParams.get("postId") ?? searchParams.get("wpPostId") ?? searchParams.get("wp_post_id"),
      editionCode: searchParams.get("editionCode") ?? searchParams.get("edition_code") ?? searchParams.get("country"),
      collectionId: searchParams.get("collectionId") ?? searchParams.get("collection_id"),
    })

    return respond(jsonWithCors(request, listPayload))
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(toErrorResponse(request, error, "Internal server error"))
  }
}

export async function POST(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) return serviceUnavailable(request)

  const { supabase, applyCookies } = routeClient
  const respond = <T extends NextResponse>(response: T): T => applyCookies(response)

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return respond(jsonWithCors(request, { error: "Unauthorized" }, { status: 401 }))
    }

    const body = await request.json()
    const payload = extractMutationPayload(body)

    if (!payload) {
      return respond(jsonWithCors(request, { error: "Invalid bookmark payload" }, { status: 400 }))
    }

    const mutationPayload = await addBookmarkForUser(
      supabase,
      user.id,
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

    return successResponse(request, respond, mutationPayload)
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(toErrorResponse(request, error, "Failed to add bookmark"))
  }
}

export async function PUT(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) return serviceUnavailable(request)

  const { supabase, applyCookies } = routeClient
  const respond = <T extends NextResponse>(response: T): T => applyCookies(response)

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return respond(jsonWithCors(request, { error: "Unauthorized" }, { status: 401 }))
    }

    const body = await request.json()
    const payload = extractMutationPayload(body)

    if (!payload) {
      return respond(jsonWithCors(request, { error: "Invalid bookmark payload" }, { status: 400 }))
    }

    const updates = buildBookmarkUpdateInput(payload.updates)
    if (!updates) {
      return respond(jsonWithCors(request, { error: "Updates payload is required" }, { status: 400 }))
    }

    const mutationPayload = await updateBookmarkForUser(
      supabase,
      user.id,
      typeof payload.postId === "string" ? payload.postId.trim() : "",
      updates,
      { revalidate: revalidateByTag, editionHints: getRequestEditionPreferences(request) },
    )

    return successResponse(request, respond, mutationPayload)
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(toErrorResponse(request, error, "Failed to update bookmark"))
  }
}

export async function DELETE(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) return serviceUnavailable(request)

  const { supabase, applyCookies } = routeClient
  const respond = <T extends NextResponse>(response: T): T => applyCookies(response)

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return respond(jsonWithCors(request, { error: "Unauthorized" }, { status: 401 }))
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")
    const postIds = searchParams.get("postIds")?.split(",").filter(Boolean)

    if (!postId && (!postIds || postIds.length === 0)) {
      return respond(jsonWithCors(request, { error: "Post ID(s) required" }, { status: 400 }))
    }

    const ids = postIds?.length ? postIds : [postId ?? ""]

    const mutationPayload = await bulkRemoveBookmarksForUser(supabase, user.id, ids, {
      revalidate: revalidateByTag,
      editionHints: getRequestEditionPreferences(request),
    })

    return successResponse(request, respond, mutationPayload)
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(toErrorResponse(request, error, "Failed to remove bookmark(s)"))
  }
}
