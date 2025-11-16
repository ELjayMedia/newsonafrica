import { type NextRequest, NextResponse } from "next/server"

import { createSupabaseRouteClient } from "@/lib/supabase/route"

import { cacheTags } from "@/lib/cache"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { derivePagination } from "@/lib/bookmarks/pagination"
import { fetchBookmarkStats, getDefaultBookmarkStats } from "@/lib/bookmarks/stats"
import { combineStatsDeltas, computeStatsDelta } from "@/lib/bookmarks/mutation-delta"
import { executeListQuery } from "@/lib/supabase/list-query"
import {
  BOOKMARK_LIST_SELECT_COLUMNS,
  type BookmarkListRow,
  type BookmarkMutationPayload,
  type BookmarkReadState,
  type BookmarkStats,
} from "@/types/bookmarks"
import { ensureBookmarkCollectionAssignment } from "@/lib/bookmarks/collections"
import { applyBookmarkCounterDelta } from "@/lib/bookmarks/counters"
import {
  buildAdditionCounterDelta,
  buildRemovalCounterDelta,
  buildUpdateCounterDelta,
  prepareBookmarkUpdatePayload,
  type BookmarkUpdateInput,
} from "@/lib/bookmarks/mutations"

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

const EDITION_COOKIE_KEYS = ["country", "preferredCountry"] as const
const DIRECT_PAYLOAD_KEYS = ["payload", "bookmark", "input", "data"] as const
const WRAPPED_PAYLOAD_KEYS = ["action", "mutation", "event"] as const
const ARRAY_PAYLOAD_KEYS = ["args", "arguments", "values"] as const
const MAX_PAYLOAD_DEPTH = 5

function serviceUnavailable(request: NextRequest) {
  return jsonWithCors(request, { error: "Supabase service unavailable" }, { status: 503 })
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractPayloadFromArray(value: unknown, depth: number): Record<string, unknown> | null {
  if (!Array.isArray(value) || depth >= MAX_PAYLOAD_DEPTH) {
    return null
  }

  for (const entry of value) {
    if (isPlainRecord(entry)) {
      const nested = extractPayloadFromRecord(entry, depth + 1)
      return nested ?? entry
    }
  }

  return null
}

function extractPayloadFromRecord(
  record: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> | null {
  if (depth >= MAX_PAYLOAD_DEPTH) {
    return null
  }

  for (const key of DIRECT_PAYLOAD_KEYS) {
    const nested = record[key]
    if (isPlainRecord(nested)) {
      const result = extractPayloadFromRecord(nested, depth + 1)
      return result ?? nested
    }
  }

  for (const key of ARRAY_PAYLOAD_KEYS) {
    const nested = extractPayloadFromArray(record[key], depth + 1)
    if (nested) {
      return nested
    }
  }

  for (const wrapper of WRAPPED_PAYLOAD_KEYS) {
    const nested = record[wrapper]
    if (isPlainRecord(nested)) {
      const result = extractPayloadFromRecord(nested, depth + 1)
      if (result) {
        return result
      }
    }
  }

  return null
}

function extractMutationPayload(body: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(body)) {
    return null
  }

  const nested = extractPayloadFromRecord(body)
  if (nested) {
    return nested
  }

  return body
}

function sanitizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const filtered = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)

  return filtered.length ? filtered : null
}

function sanitizeFeaturedImage(value: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(value)) {
    return null
  }

  return value
}

const READ_STATE_VALUES: readonly BookmarkReadState[] = [
  "unread",
  "in_progress",
  "read",
]
const READ_STATE_SET = new Set<BookmarkReadState>(READ_STATE_VALUES)

const SORTABLE_COLUMNS = {
  created_at: { alias: "createdAt" },
  title: { alias: "title" },
  read_state: { alias: "readState" },
  wp_post_id: { alias: "postId" },
  edition_code: { alias: "editionCode" },
  collection_id: { alias: "collectionId" },
} as const

type SortColumn = keyof typeof SORTABLE_COLUMNS

function sanitizeEditionCode(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed.length) {
      return null
    }
    const normalized = trimmed.toLowerCase()
    if (normalized === "null") {
      return null
    }
    return normalized
  }
  if (value === null) {
    return null
  }
  return undefined
}

function sanitizeCollectionId(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed.length || trimmed.toLowerCase() === "null") {
      return null
    }
    return trimmed
  }
  if (value === null) {
    return null
  }
  return undefined
}

function sanitizeNoteValue(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    return value
  }
  if (value === null) {
    return null
  }
  return undefined
}

function sanitizeReadState(value: unknown): BookmarkReadState | null | undefined {
  if (typeof value === "string") {
    const normalizedRaw = value
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")
    if (normalizedRaw === "null") {
      return null
    }
    const normalized = normalizedRaw as BookmarkReadState
    if (READ_STATE_SET.has(normalized)) {
      return normalized
    }
    return undefined
  }
  if (value === null) {
    return null
  }
  return undefined
}

function sanitizeNullableString(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    return value
  }
  if (value === null) {
    return null
  }
  return undefined
}

function sanitizeNullableCategory(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (value === null) {
    return null
  }
  return undefined
}

function resolveSortColumn(value: string | null): SortColumn {
  if (value && value in SORTABLE_COLUMNS) {
    return value as SortColumn
  }
  return "created_at"
}

function buildBookmarkUpdateInput(raw: unknown): BookmarkUpdateInput | null {
  if (!isPlainRecord(raw)) {
    return null
  }

  const updates: BookmarkUpdateInput = {}

  const assign = <K extends keyof BookmarkUpdateInput>(key: K, value: BookmarkUpdateInput[K] | undefined) => {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  assign("title", sanitizeNullableString(raw.title))
  assign("slug", sanitizeNullableString(raw.slug))
  assign("excerpt", sanitizeNullableString(raw.excerpt))
  assign("category", sanitizeNullableCategory(raw.category))

  if (Object.prototype.hasOwnProperty.call(raw, "tags")) {
    assign("tags", sanitizeStringArray(raw.tags))
  }

  const readStateValue = sanitizeReadState((raw as Record<string, unknown>).readState ?? (raw as Record<string, unknown>).status)
  assign("readState", readStateValue)

  const noteValue = sanitizeNoteValue((raw as Record<string, unknown>).note ?? (raw as Record<string, unknown>).notes)
  assign("note", noteValue)

  if (Object.prototype.hasOwnProperty.call(raw, "featuredImage")) {
    assign("featuredImage", sanitizeFeaturedImage((raw as Record<string, unknown>).featuredImage))
  }

  const editionValue = sanitizeEditionCode(
    (raw as Record<string, unknown>).editionCode ?? (raw as Record<string, unknown>).country,
  )
  assign("editionCode", editionValue)

  const collectionValue = sanitizeCollectionId((raw as Record<string, unknown>).collectionId)
  assign("collectionId", collectionValue)

  return updates
}

function successResponse(
  request: NextRequest,
  respond: <T extends NextResponse>(response: T) => T,
  payload: BookmarkMutationPayload,
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

export async function GET(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) {
    return serviceUnavailable(request)
  }

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
    const limit = Math.max(Number.parseInt(searchParams.get("limit") || "20"), 1)
    const search = searchParams.get("search")
    const category = searchParams.get("category")
    const readStateParam = searchParams.get("readState") ?? searchParams.get("status")
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc"
    const sortColumn = resolveSortColumn(searchParams.get("sortBy"))

    const cursorParam = searchParams.get("cursor")
    let cursor: {
      sortBy: SortColumn
      sortOrder: "asc" | "desc"
      value: string | number | null
      id: string | null
    } | null = null

    if (cursorParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(cursorParam))
        if (decoded && typeof decoded === "object") {
          const parsed = decoded as Record<string, unknown>
          const cursorSortBy = resolveSortColumn(
            typeof parsed.sortBy === "string" ? parsed.sortBy : sortColumn,
          )
          const cursorSortOrder = parsed.sortOrder === "asc" ? "asc" : "desc"
          const cursorValue =
            typeof parsed.value === "string" || typeof parsed.value === "number"
              ? (parsed.value as string | number)
              : null
          const cursorId = typeof parsed.id === "string" ? parsed.id : null

          if (cursorValue !== null && cursorId) {
            cursor = {
              sortBy: cursorSortBy,
              sortOrder: cursorSortOrder,
              value: cursorValue,
              id: cursorId,
            }
          }
        }
      } catch (error) {
        console.warn("Failed to decode bookmark cursor", error)
      }
    }

    const ascending = sortOrder === "asc"

    const { data: rows, error } = await executeListQuery(supabase, "bookmarks", (query) => {
      let builder = query.select(BOOKMARK_LIST_SELECT_COLUMNS).eq("user_id", user.id)

      const searchTerm = typeof search === "string" ? search.trim() : ""
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

      if (category && category !== "all") {
        builder = builder.eq("category", category)
      }

      const postIdFilter =
        searchParams.get("postId") ?? searchParams.get("wpPostId") ?? searchParams.get("wp_post_id")
      if (postIdFilter && postIdFilter.trim().length) {
        builder = builder.eq("wp_post_id", postIdFilter.trim())
      }

      const editionFilterRaw =
        searchParams.get("editionCode") ??
        searchParams.get("edition_code") ??
        searchParams.get("country")
      if (editionFilterRaw && editionFilterRaw !== "all") {
        const editionFilter = sanitizeEditionCode(editionFilterRaw)
        if (editionFilter === null) {
          builder = builder.is("edition_code", null)
        } else if (editionFilter) {
          builder = builder.eq("edition_code", editionFilter)
        }
      }

      const collectionFilterRaw = searchParams.get("collectionId") ?? searchParams.get("collection_id")
      if (collectionFilterRaw) {
        const collectionFilter = sanitizeCollectionId(collectionFilterRaw)
        if (collectionFilter === null) {
          builder = builder.is("collection_id", null)
        } else if (collectionFilter) {
          builder = builder.eq("collection_id", collectionFilter)
        }
      }

      if (readStateParam && readStateParam !== "all") {
        const normalizedReadState = sanitizeReadState(readStateParam)
        if (normalizedReadState === null) {
          builder = builder.is("read_state", null)
        } else if (normalizedReadState) {
          builder = builder.eq("read_state", normalizedReadState)
        } else if (readStateParam === "unread") {
          builder = builder.or("read_state.eq.unread,read_state.eq.in_progress,read_state.is.null")
        }
      }

      builder = builder
        .order(sortColumn, { ascending })
        .order("id", { ascending })

      if (cursor && cursor.sortBy === sortColumn && cursor.sortOrder === sortOrder) {
        const comparator = ascending ? "gt" : "lt"
        const idComparator = ascending ? "gt" : "lt"
        const cursorValue = cursor.value
        const cursorId = cursor.id

        const filterClauses = [
          `${cursor.sortBy}.${comparator}.${cursorValue}`,
          `and(${cursor.sortBy}.eq.${cursorValue},id.${idComparator}.${cursorId})`,
        ]

        builder = builder.or(filterClauses.join(","))
      }

      return builder.limit(limit + 1)
    })

    if (error) {
      console.error("Error fetching bookmarks:", error)
      return respond(jsonWithCors(request, { error: "Failed to fetch bookmarks" }, { status: 500 }))
    }

    const { items: bookmarks, pagination } = derivePagination<BookmarkListRow>({
      limit,
      rows: (rows ?? []) as BookmarkListRow[],
      cursorEncoder: (row) => {
        const record = row as BookmarkListRow
        const sortKey = SORTABLE_COLUMNS[sortColumn]?.alias ?? sortColumn
        const sortValue =
          (record as Record<string, unknown>)[sortKey] ??
          (record as Record<string, unknown>)[sortColumn] ??
          null
        const cursorPayload = {
          sortBy: sortColumn,
          sortOrder,
          value: sortValue,
          id: record.id ?? null,
        }
        try {
          return JSON.stringify(cursorPayload)
        } catch (cursorError) {
          console.warn("Failed to encode bookmark cursor", cursorError)
          return null
        }
      },
    })

    let stats: BookmarkStats | null = null
    if (!cursor) {
      try {
        stats = await fetchBookmarkStats(supabase, user.id)
      } catch (statsError) {
        console.error("Failed to fetch bookmark stats:", statsError)
        stats = getDefaultBookmarkStats()
      }
    }

    return respond(
      jsonWithCors(request, {
        bookmarks,
        stats,
        pagination,
      }),
    )
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(jsonWithCors(request, { error: "Internal server error" }, { status: 500 }))
  }
}

function invalidateBookmarksCache(
  userId: string,
  editions: Iterable<string | null | undefined> = [],
  collections: Iterable<string | null | undefined> = [],
) {
  const editionTags = new Set<string>()
  const collectionTags = new Set<string>()

  for (const edition of editions) {
    editionTags.add(cacheTags.bookmarks(edition))
  }

  if (editionTags.size === 0) {
    editionTags.add(cacheTags.bookmarks(undefined))
  }

  for (const collection of collections) {
    collectionTags.add(cacheTags.bmCollection(collection))
  }

  revalidateByTag(cacheTags.bmUser(userId))
  editionTags.forEach((tag) => revalidateByTag(tag))
  collectionTags.forEach((tag) => revalidateByTag(tag))
}

export async function POST(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) {
    return serviceUnavailable(request)
  }

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

    const postId = typeof payload.postId === "string" ? payload.postId.trim() : ""

    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

    const titleValue = typeof payload.title === "string" ? payload.title : undefined
    const slugValue = typeof payload.slug === "string" ? payload.slug : undefined
    const excerptValue = typeof payload.excerpt === "string" ? payload.excerpt : undefined
    const categoryValue = sanitizeNullableCategory(payload.category) ?? null
    const tagsValue = sanitizeStringArray(payload.tags)
    const noteValue = sanitizeNoteValue(payload.note ?? payload.notes)
    const readStateValue = sanitizeReadState(payload.readState ?? payload.status)
    const featuredImageValue = sanitizeFeaturedImage(payload.featuredImage)
    const editionCodeInput = sanitizeEditionCode(payload.editionCode ?? payload.country) ?? null
    const collectionInput = sanitizeCollectionId(payload.collectionId)

    // Check if bookmark already exists
    const { data: existingBookmark } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("wp_post_id", postId)
      .single()

    if (existingBookmark) {
      return respond(jsonWithCors(request, { error: "Bookmark already exists" }, { status: 409 }))
    }

    let resolvedCollectionId: string | null = null
    try {
      resolvedCollectionId = await ensureBookmarkCollectionAssignment(supabase, {
        userId: user.id,
        collectionId: collectionInput ?? null,
        editionCode: editionCodeInput,
      })
    } catch (collectionError) {
      console.error("Failed to resolve bookmark collection", collectionError)
      return respond(jsonWithCors(request, { error: "Failed to add bookmark" }, { status: 500 }))
    }

    const bookmarkData = {
      user_id: user.id,
      wp_post_id: postId,
      edition_code: editionCodeInput,
      collection_id: resolvedCollectionId,
      title: titleValue ?? "Untitled Post",
      slug: slugValue ?? "",
      excerpt: excerptValue ?? "",
      featured_image: featuredImageValue,
      category: categoryValue,
      tags: tagsValue,
      read_state: readStateValue ?? "unread",
      note: noteValue ?? null,
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .insert(bookmarkData)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      console.error("Error adding bookmark:", error)
      return respond(jsonWithCors(request, { error: "Failed to add bookmark" }, { status: 500 }))
    }

    const insertedBookmark = data as BookmarkListRow
    const primaryEdition = insertedBookmark.editionCode ?? editionCodeInput
    const editionSources = [primaryEdition, ...getRequestEditionPreferences(request)]
    const collectionSources = [insertedBookmark.collectionId ?? resolvedCollectionId ?? null]

    const additionDelta = buildAdditionCounterDelta(insertedBookmark)
    try {
      await applyBookmarkCounterDelta(supabase, { userId: user.id, delta: additionDelta })
    } catch (counterError) {
      console.error("Failed to update bookmark counters", counterError)
      return respond(jsonWithCors(request, { error: "Failed to add bookmark" }, { status: 500 }))
    }

    invalidateBookmarksCache(user.id, editionSources, collectionSources)
    const mutationPayload: BookmarkMutationPayload = {
      added: [insertedBookmark],
      statsDelta: computeStatsDelta({ next: insertedBookmark }),
    }
    return successResponse(request, respond, mutationPayload)
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(jsonWithCors(request, { error: "Internal server error" }, { status: 500 }))
  }
}

export async function PUT(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) {
    return serviceUnavailable(request)
  }

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

    const postId = typeof payload.postId === "string" ? payload.postId.trim() : ""
    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

    const updates = buildBookmarkUpdateInput(payload.updates)
    if (!updates) {
      return respond(jsonWithCors(request, { error: "Updates payload is required" }, { status: 400 }))
    }

    const { data: existing, error: existingError } = await supabase
      .from("bookmarks")
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .eq("wp_post_id", postId)
      .maybeSingle()

    if (existingError) {
      console.error("Failed to load bookmark", existingError)
      return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
    }

    if (!existing) {
      return respond(jsonWithCors(request, { error: "Bookmark not found" }, { status: 404 }))
    }

    const existingRow = existing as BookmarkListRow
    const preparation = prepareBookmarkUpdatePayload(existingRow, updates)

    if (!preparation.hasWritableUpdate) {
      return respond(jsonWithCors(request, { error: "No bookmark updates provided" }, { status: 400 }))
    }

    const {
      dbUpdates: updatePayload,
      targetEditionCode,
      targetCollectionId,
      shouldResolveCollection,
    } = preparation

    if (shouldResolveCollection) {
      try {
        const resolvedCollectionId = await ensureBookmarkCollectionAssignment(supabase, {
          userId: user.id,
          collectionId: targetCollectionId,
          editionCode: targetEditionCode,
        })
        updatePayload.collection_id = resolvedCollectionId
      } catch (collectionError) {
        console.error("Failed to resolve bookmark collection", collectionError)
        return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
      }
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(updatePayload)
      .eq("user_id", user.id)
      .eq("wp_post_id", postId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      console.error("Error updating bookmark:", error)
      return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
    }

    const updatedBookmark = data as BookmarkListRow
    const updatedEdition =
      updatedBookmark.editionCode ??
      targetEditionCode ??
      existingRow.editionCode ??
      preparation.targetEditionCode ??
      null
    const editionSources = [updatedEdition, ...getRequestEditionPreferences(request)]
    const collectionSources = [
      existingRow.collectionId ?? null,
      updatedBookmark.collectionId ?? targetCollectionId ?? existingRow.collectionId ?? null,
    ]

    const counterDelta = buildUpdateCounterDelta(existingRow, updatedBookmark)
    if (counterDelta) {
      try {
        await applyBookmarkCounterDelta(supabase, { userId: user.id, delta: counterDelta })
      } catch (counterError) {
        console.error("Failed to update bookmark counters", counterError)
        return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
      }
    }

    invalidateBookmarksCache(user.id, editionSources, collectionSources)
    const mutationPayload: BookmarkMutationPayload = {
      updated: updatedBookmark ? [updatedBookmark] : [],
      statsDelta: computeStatsDelta({ previous: existing as BookmarkListRow, next: updatedBookmark ?? null }),
    }
    return successResponse(request, respond, mutationPayload)
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(jsonWithCors(request, { error: "Internal server error" }, { status: 500 }))
  }
}

export async function DELETE(request: NextRequest) {
  logRequest(request)
  const routeClient = createSupabaseRouteClient(request)

  if (!routeClient) {
    return serviceUnavailable(request)
  }

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
    const postIds = searchParams.get("postIds")?.split(",")

    if (!postId && !postIds) {
      return respond(jsonWithCors(request, { error: "Post ID(s) required" }, { status: 400 }))
    }

    let query = supabase.from("bookmarks").delete().eq("user_id", user.id)

    if (postIds && postIds.length > 0) {
      query = query.in("wp_post_id", postIds)
    } else if (postId) {
      query = query.eq("wp_post_id", postId)
    }

    const { data: removedRows, error } = await query.select(BOOKMARK_LIST_SELECT_COLUMNS)

    if (error) {
      console.error("Error removing bookmark(s):", error)
      return respond(jsonWithCors(request, { error: "Failed to remove bookmark(s)" }, { status: 500 }))
    }

    const removedBookmarks = (removedRows ?? []) as BookmarkListRow[]
    const removalDelta = buildRemovalCounterDelta(removedBookmarks)
    if (removalDelta) {
      try {
        await applyBookmarkCounterDelta(supabase, { userId: user.id, delta: removalDelta })
      } catch (counterError) {
        console.error("Failed to update bookmark counters", counterError)
        return respond(jsonWithCors(request, { error: "Failed to remove bookmark(s)" }, { status: 500 }))
      }
    }

    const removedCountries = removedBookmarks.map((row) => row.editionCode ?? null)
    const editionSources = [...removedCountries, ...getRequestEditionPreferences(request)]
    const collectionSources = removedBookmarks.map((row) => row.collectionId ?? null)

    invalidateBookmarksCache(user.id, editionSources, collectionSources)
    const mutationPayload: BookmarkMutationPayload = {
      removed: removedBookmarks,
      statsDelta: combineStatsDeltas(
        removedBookmarks.map((row) => computeStatsDelta({ previous: row })),
      ),
    }
    return successResponse(request, respond, mutationPayload)
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(jsonWithCors(request, { error: "Internal server error" }, { status: 500 }))
  }
}
