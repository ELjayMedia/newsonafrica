import { type NextRequest, NextResponse } from "next/server"

import { createSupabaseRouteClient } from "@/utils/supabase/route"

import { CACHE_TAGS } from "@/lib/cache/constants"
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

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

function serviceUnavailable(request: NextRequest) {
  return jsonWithCors(request, { error: "Supabase service unavailable" }, { status: 503 })
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
    const page = Math.max(Number.parseInt(searchParams.get("page") || "1"), 1)
    const limit = Math.max(Number.parseInt(searchParams.get("limit") || "20"), 1)
    const search = searchParams.get("search")
    const category = searchParams.get("category")
    const status = searchParams.get("status") // 'read' | 'unread'
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const offset = (page - 1) * limit

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
          builder = builder.neq("read_status", "read")
        } else {
          builder = builder.eq("read_status", status)
        }
      }

      builder = builder.order(sortBy, { ascending: sortOrder === "asc" })

      return builder.range(offset, offset + limit)
    })

    if (error) {
      console.error("Error fetching bookmarks:", error)
      return respond(jsonWithCors(request, { error: "Failed to fetch bookmarks" }, { status: 500 }))
    }

    const { items: bookmarks, pagination } = derivePagination<BookmarkListRow>({
      page,
      limit,
      rows: (rows ?? []) as BookmarkListRow[],
      cursorEncoder: (row) => {
        const record = row as BookmarkListRow
        const cursorPayload = {
          sortBy,
          sortOrder,
          value: (record as Record<string, unknown>)[sortBy] ?? null,
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
    if (page === 1) {
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

function invalidateBookmarksCache() {
  revalidateByTag(CACHE_TAGS.BOOKMARKS)
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
    const { postId, title, slug, excerpt, featuredImage, category, tags, notes, country } = body

    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

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
      country: country || null,
      title: title || "Untitled Post",
      slug: slug || "",
      excerpt: excerpt || "",
      featured_image: featuredImage && typeof featuredImage === "object" ? featuredImage : null,
      category: category || null,
      tags: tags || null,
      read_status: "unread" as const,
      notes: notes || null,
    }

    const { data, error } = await supabase.from("bookmarks").insert(bookmarkData).select().single()

    if (error) {
      console.error("Error adding bookmark:", error)
      return respond(jsonWithCors(request, { error: "Failed to add bookmark" }, { status: 500 }))
    }

    invalidateBookmarksCache()
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
    const { postId, updates } = body

    if (!postId) {
      return respond(jsonWithCors(request, { error: "Post ID is required" }, { status: 400 }))
    }

    const sanitizedUpdates = { ...updates }
    if ("featuredImage" in sanitizedUpdates) {
      sanitizedUpdates.featured_image =
        sanitizedUpdates.featuredImage && typeof sanitizedUpdates.featuredImage === "object"
          ? sanitizedUpdates.featuredImage
          : null
      delete sanitizedUpdates.featuredImage
    } else if ("featured_image" in sanitizedUpdates) {
      sanitizedUpdates.featured_image =
        sanitizedUpdates.featured_image && typeof sanitizedUpdates.featured_image === "object"
          ? sanitizedUpdates.featured_image
          : null
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(sanitizedUpdates)
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .select()
      .single()

    if (error) {
      console.error("Error updating bookmark:", error)
      return respond(jsonWithCors(request, { error: "Failed to update bookmark" }, { status: 500 }))
    }

    invalidateBookmarksCache()
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
      query = query.in("post_id", postIds)
    } else if (postId) {
      query = query.eq("post_id", postId)
    }

    const { error } = await query

    if (error) {
      console.error("Error removing bookmark(s):", error)
      return respond(jsonWithCors(request, { error: "Failed to remove bookmark(s)" }, { status: 500 }))
    }

    invalidateBookmarksCache()
    return respond(NextResponse.json({ success: true }))
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return respond(jsonWithCors(request, { error: "Internal server error" }, { status: 500 }))
  }
}
