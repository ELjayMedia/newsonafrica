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
  type BookmarkStats,
} from "@/types/bookmarks"
import type { Database } from "@/types/supabase"

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

const EDITION_COOKIE_KEYS = ["country", "preferredCountry"] as const
const NESTED_PAYLOAD_KEYS = ["payload", "bookmark", "input", "data"] as const

function serviceUnavailable(request: NextRequest) {
  return jsonWithCors(request, { error: "Supabase service unavailable" }, { status: 503 })
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractMutationPayload(body: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(body)) {
    return null
  }

  for (const key of NESTED_PAYLOAD_KEYS) {
    const nested = body[key]
    if (isPlainRecord(nested)) {
      return nested
    }
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

function successResponse(
  request: NextRequest,
  respond: <T extends NextResponse>(response: T) => T,
  payload: BookmarkMutationPayload,
) {
  return respond(jsonWithCors(request, { data: payload }))
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
    const status = searchParams.get("status") // 'read' | 'unread'
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const cursorParam = searchParams.get("cursor")
    let cursor: {
      sortBy: string
      sortOrder: string
      value: string | number | null
      id: string | null
    } | null = null

    if (cursorParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(cursorParam))
        if (decoded && typeof decoded === "object") {
          const parsed = decoded as Record<string, unknown>
          const cursorSortBy = typeof parsed.sortBy === "string" ? parsed.sortBy : sortBy
          const cursorSortOrder = typeof parsed.sortOrder === "string" ? parsed.sortOrder : sortOrder
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

      if (search) {
        builder = builder.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,notes.ilike.%${search}%`)
      }

      if (category && category !== "all") {
        builder = builder.eq("category", category)
      }

      if (status && status !== "all") {
        if (status === "unread") {
          builder = builder.neq("read_state", "read")
        } else {
          builder = builder.eq("read_state", status)
        }
      }

      builder = builder
        .order(sortBy, { ascending })
        .order("id", { ascending })

      if (cursor && cursor.sortBy === sortBy && cursor.sortOrder === sortOrder) {
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
        const camelSortKey = sortBy.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
        const sortValue =
          (record as Record<string, unknown>)[camelSortKey] ??
          (record as Record<string, unknown>)[sortBy] ??
          null
        const cursorPayload = {
          sortBy,
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
) {
  const tags = new Set<string>()

  for (const edition of editions) {
    tags.add(cacheTags.bookmarks(edition))
  }

  if (tags.size === 0) {
    tags.add(cacheTags.bookmarks(undefined))
  }

  revalidateByTag(cacheTags.bmUser(userId))
  tags.forEach((tag) => revalidateByTag(tag))
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

    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      console.warn("Failed to parse bookmark POST body", error)
      return respond(jsonWithCors(request, { error: "Invalid JSON payload" }, { status: 400 }))
    }

    const payload = extractMutationPayload(body)
    if (!payload) {
      return respond(jsonWithCors(request, { error: "Invalid bookmark payload" }, { status: 400 }))
    }

    const postIdValue = payload.postId
    const postId = typeof postIdValue === "string" ? postIdValue.trim() : ""

    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

    const titleValue = typeof payload.title === "string" ? payload.title : undefined
    const slugValue = typeof payload.slug === "string" ? payload.slug : undefined
    const excerptValue = typeof payload.excerpt === "string" ? payload.excerpt : undefined
    const categoryValue =
      typeof payload.category === "string" && payload.category.trim().length > 0
        ? payload.category
        : null
    const tagsValue = sanitizeStringArray(payload.tags)
    const notesRaw = payload.notes ?? payload.note
    const notesValue =
      typeof notesRaw === "string" ? notesRaw : notesRaw === null ? null : undefined
    const countryValue =
      typeof payload.country === "string" && payload.country.trim().length > 0
        ? payload.country
        : null
    const featuredImageValue = sanitizeFeaturedImage(payload.featuredImage)

    // Check if bookmark already exists
    const { data: existingBookmark } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single()

    if (existingBookmark) {
      return respond(jsonWithCors(request, { error: "Bookmark already exists" }, { status: 409 }))
    }

    const bookmarkData = {
      user_id: user.id,
      post_id: postId,
      country: countryValue || null,
      title: titleValue || "Untitled Post",
      slug: slugValue || "",
      excerpt: excerptValue || "",
      featured_image: featuredImageValue,
      category: categoryValue,
      tags: tagsValue,
      read_state: "unread" as const,
      notes: typeof notesValue === "undefined" ? null : notesValue,
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

    const insertedBookmark = (data ?? null) as BookmarkListRow | null
    if (!insertedBookmark) {
      return respond(jsonWithCors(request, { error: "Failed to add bookmark" }, { status: 500 }))
    }
    const primaryEdition =
      typeof insertedBookmark.country === "string"
        ? insertedBookmark.country
        : bookmarkData.country ?? null
    const editionSources = [primaryEdition, ...getRequestEditionPreferences(request)]

    invalidateBookmarksCache(user.id, editionSources)
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

    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      console.warn("Failed to parse bookmark PUT body", error)
      return respond(jsonWithCors(request, { error: "Invalid JSON payload" }, { status: 400 }))
    }

    const payload = extractMutationPayload(body)
    if (!payload) {
      return respond(jsonWithCors(request, { error: "Invalid bookmark payload" }, { status: 400 }))
    }

    const postIdValue = payload.postId
    const postId = typeof postIdValue === "string" ? postIdValue.trim() : ""

    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

    if (!isPlainRecord(payload.updates)) {
      return respond(jsonWithCors(request, { error: "Updates payload is required" }, { status: 400 }))
    }

    const updates = payload.updates
    const dbUpdates: Database["public"]["Tables"]["bookmarks"]["Update"] = {}
    let hasUpdates = false

    const assignStringField = (
      key: string,
      setter: (value: string | null) => void,
      allowEmpty = false,
    ) => {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) {
        return
      }
      const rawValue = updates[key]
      if (rawValue === null) {
        setter(null)
        hasUpdates = true
        return
      }
      if (typeof rawValue === "string") {
        if (!allowEmpty && rawValue.trim().length === 0) {
          setter(null)
        } else {
          setter(rawValue)
        }
        hasUpdates = true
        return
      }
      throw new Error(`Invalid value for ${key}`)
    }

    try {
      assignStringField("country", (value) => {
        dbUpdates.country = value
      })
      assignStringField("title", (value) => {
        dbUpdates.title = value
      }, true)
      assignStringField("slug", (value) => {
        dbUpdates.slug = value ?? null
      }, true)
      assignStringField("excerpt", (value) => {
        dbUpdates.excerpt = value
      }, true)
      assignStringField("category", (value) => {
        dbUpdates.category = value
      })

      if (Object.prototype.hasOwnProperty.call(updates, "tags")) {
        const tags = sanitizeStringArray(updates.tags)
        dbUpdates.tags = tags
        hasUpdates = true
      }

      if (Object.prototype.hasOwnProperty.call(updates, "readState")) {
        const readState = updates.readState
        if (readState === null) {
          dbUpdates.read_state = null
        } else if (readState === "read" || readState === "unread") {
          dbUpdates.read_state = readState
        } else {
          throw new Error("Invalid read state")
        }
        hasUpdates = true
      }

      if (Object.prototype.hasOwnProperty.call(updates, "notes")) {
        const notesValue = updates.notes
        if (typeof notesValue === "string") {
          dbUpdates.notes = notesValue
        } else if (notesValue === null) {
          dbUpdates.notes = null
        } else {
          throw new Error("Invalid note value")
        }
        hasUpdates = true
      }

      if (Object.prototype.hasOwnProperty.call(updates, "featuredImage")) {
        const value = sanitizeFeaturedImage(updates.featuredImage)
        dbUpdates.featured_image = value
        hasUpdates = true
      }
    } catch (validationError) {
      const message =
        validationError instanceof Error ? validationError.message : "Invalid update payload"
      return respond(jsonWithCors(request, { error: message }, { status: 400 }))
    }

    if (!hasUpdates) {
      return respond(jsonWithCors(request, { error: "No updates provided" }, { status: 400 }))
    }

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("bookmarks")
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle()

    if (existingError) {
      console.error("Error loading bookmark before update:", existingError)
      return respond(jsonWithCors(request, { error: "Failed to load bookmark" }, { status: 500 }))
    }

    if (!existing) {
      return respond(jsonWithCors(request, { error: "Bookmark not found" }, { status: 404 }))
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(dbUpdates)
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      console.error("Error updating bookmark:", error)
      return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
    }

    const updatedBookmark = (data ?? null) as BookmarkListRow | null
    const updatedCountry =
      typeof updatedBookmark?.country === "string"
        ? updatedBookmark.country
        : typeof updates.country === "string"
          ? updates.country
          : null
    const editionSources = [updatedCountry, ...getRequestEditionPreferences(request)]

    invalidateBookmarksCache(user.id, editionSources)
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
      query = query.in("post_id", postIds)
    } else if (postId) {
      query = query.eq("post_id", postId)
    }

    const { data: removedRows, error } = await query.select(BOOKMARK_LIST_SELECT_COLUMNS)

    if (error) {
      console.error("Error removing bookmark(s):", error)
      return respond(jsonWithCors(request, { error: "Failed to remove bookmark(s)" }, { status: 500 }))
    }

    const removedList = Array.isArray(removedRows)
      ? (removedRows as BookmarkListRow[])
      : []
    const removedCountries = removedList.map((row) => row.country ?? null)
    const editionSources = [...removedCountries, ...getRequestEditionPreferences(request)]

    invalidateBookmarksCache(user.id, editionSources)
    const mutationPayload: BookmarkMutationPayload = {
      removed: removedList,
      statsDelta: combineStatsDeltas(
        removedList.map((row) => computeStatsDelta({ previous: row })),
      ),
    }
    return successResponse(request, respond, mutationPayload)
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(jsonWithCors(request, { error: "Internal server error" }, { status: 500 }))
  }
}
