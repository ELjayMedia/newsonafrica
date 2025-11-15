import { type NextRequest, NextResponse } from "next/server"

import { createSupabaseRouteClient } from "@/lib/supabase/route"

import { cacheTags } from "@/lib/cache"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { derivePagination } from "@/lib/bookmarks/pagination"
import { fetchBookmarkStats, getDefaultBookmarkStats } from "@/lib/bookmarks/stats"
import { executeListQuery } from "@/lib/supabase/list-query"
import {
  BOOKMARK_LIST_SELECT_COLUMNS,
  type BookmarkListRow,
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

function serviceUnavailable(request: NextRequest) {
  return jsonWithCors(request, { error: "Supabase service unavailable" }, { status: 503 })
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
        builder = builder.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,note.ilike.%${search}%`)
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

    const body = await request.json()
    const {
      postId,
      title,
      slug,
      excerpt,
      featuredImage,
      category,
      tags,
      notes,
      country,
      collectionId,
    } = body

    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

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

    const editionCodeInput = country ?? null
    let resolvedCollectionId: string | null = null
    try {
      resolvedCollectionId = await ensureBookmarkCollectionAssignment(supabase, {
        userId: user.id,
        collectionId: collectionId ?? null,
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
      title: title || "Untitled Post",
      slug: slug || "",
      excerpt: excerpt || "",
      featured_image: featuredImage && typeof featuredImage === "object" ? featuredImage : null,
      category: category || null,
      tags: tags || null,
      read_state: "unread" as const,
      note: notes || null,
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
    const primaryEdition = insertedBookmark.country ?? editionCodeInput
    const editionSources = [primaryEdition, ...getRequestEditionPreferences(request)]

    const additionDelta = buildAdditionCounterDelta(insertedBookmark)
    try {
      await applyBookmarkCounterDelta(supabase, { userId: user.id, delta: additionDelta })
    } catch (counterError) {
      console.error("Failed to update bookmark counters", counterError)
      return respond(jsonWithCors(request, { error: "Failed to add bookmark" }, { status: 500 }))
    }

    invalidateBookmarksCache(user.id, editionSources)
    return respond(NextResponse.json({ bookmark: data }))
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
    const { postId } = body
    const updates = body.updates as BookmarkUpdateInput | undefined

    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

    if (!updates || typeof updates !== "object") {
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

    const { dbUpdates, targetEditionCode, targetCollectionId, shouldResolveCollection } = preparation

    if (shouldResolveCollection) {
      try {
        const resolvedCollectionId = await ensureBookmarkCollectionAssignment(supabase, {
          userId: user.id,
          collectionId: targetCollectionId,
          editionCode: targetEditionCode,
        })
        dbUpdates.collection_id = resolvedCollectionId
      } catch (collectionError) {
        console.error("Failed to resolve bookmark collection", collectionError)
        return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
      }
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(dbUpdates)
      .eq("user_id", user.id)
      .eq("wp_post_id", postId)
      .select(BOOKMARK_LIST_SELECT_COLUMNS)
      .single()

    if (error) {
      console.error("Error updating bookmark:", error)
      return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
    }

    const updatedBookmark = data as BookmarkListRow
    const updatedCountry =
      updatedBookmark.country ?? targetEditionCode ?? existingRow.country ?? preparation.targetEditionCode ?? null
    const editionSources = [updatedCountry, ...getRequestEditionPreferences(request)]

    const counterDelta = buildUpdateCounterDelta(existingRow, updatedBookmark)
    if (counterDelta) {
      try {
        await applyBookmarkCounterDelta(supabase, { userId: user.id, delta: counterDelta })
      } catch (counterError) {
        console.error("Failed to update bookmark counters", counterError)
        return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
      }
    }

    invalidateBookmarksCache(user.id, editionSources)
    return respond(NextResponse.json({ bookmark: data }))
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

    const removedCountries = removedBookmarks.map((row) => row.country ?? null)
    const editionSources = [...removedCountries, ...getRequestEditionPreferences(request)]

    invalidateBookmarksCache(user.id, editionSources)
    return respond(NextResponse.json({ success: true }))
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(jsonWithCors(request, { error: "Internal server error" }, { status: 500 }))
  }
}
