import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export const runtime = 'nodejs'

interface BookmarkStats {
  total: number
  unread: number
  categories: Record<string, number>
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const MAX_PAGE = 1000
    const MAX_LIMIT = 100
    const pageParam = searchParams.get("page") || "1"
    const limitParam = searchParams.get("limit") || "20"
    const sortByParam = searchParams.get("sortBy") || "created_at"
    const sortOrderParam = searchParams.get("sortOrder") || "desc"

    const page = Number(pageParam)
    const limit = Number(limitParam)
    const allowedSortBy = ["created_at", "title", "read_status"]
    const allowedSortOrder = ["asc", "desc"]

    if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
      return NextResponse.json(
        { error: `Invalid page. Must be a positive integer up to ${MAX_PAGE}.` },
        { status: 400 },
      )
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return NextResponse.json(
        {
          error: `Invalid limit. Must be a positive integer up to ${MAX_LIMIT}.`,
        },
        { status: 400 },
      )
    }

    if (!allowedSortBy.includes(sortByParam)) {
      return NextResponse.json(
        {
          error: `Invalid sortBy. Allowed values are: ${allowedSortBy.join(", ")}.`,
        },
        { status: 400 },
      )
    }

    if (!allowedSortOrder.includes(sortOrderParam)) {
      return NextResponse.json(
        {
          error: `Invalid sortOrder. Allowed values are: ${allowedSortOrder.join(", ")}.`,
        },
        { status: 400 },
      )
    }

    const search = searchParams.get("search")
    const category = searchParams.get("category")
    const status = searchParams.get("status") // 'read' | 'unread'
    const sortBy = sortByParam
    const sortOrder = sortOrderParam

    const offset = (page - 1) * limit

    let query = supabase.from("bookmarks").select("*", { count: "exact" }).eq("user_id", user.id)

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    if (status && status !== "all") {
      if (status === "unread") {
        query = query.neq("read_status", "read")
      } else {
        query = query.eq("read_status", status)
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: bookmarks, error, count } = await query

    if (error) {
      console.error("Error fetching bookmarks:", error)
      return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 })
    }

    // Calculate stats using RPC
    const { data: statsData, error: statsError } = await supabase
      .rpc<BookmarkStats>("get_bookmark_stats", { user_uuid: user.id })
      .single()

    if (statsError) {
      console.error("Error fetching bookmark stats:", statsError)
    }

    const stats: BookmarkStats = {
      total: statsData?.total ?? count ?? 0,
      unread: statsData?.unread ?? 0,
      categories: statsData?.categories ?? {},
    }

    return NextResponse.json({
      bookmarks: bookmarks || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postId, title, slug, excerpt, featuredImage, category, tags, notes } = body

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    // Check if bookmark already exists
    const { data: existingBookmark } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single()

    if (existingBookmark) {
      return NextResponse.json({ error: "Bookmark already exists" }, { status: 409 })
    }

    const bookmarkData = {
      user_id: user.id,
      post_id: postId,
      title: title || "Untitled Post",
      slug: slug || "",
      excerpt: excerpt || "",
      featuredImage: featuredImage ? JSON.stringify(featuredImage) : null,
      category: category || null,
      tags: tags || null,
      read_status: "unread" as const,
      notes: notes || null,
    }

    const { data, error } = await supabase.from("bookmarks").insert(bookmarkData).select().single()

    if (error) {
      console.error("Error adding bookmark:", error)
      return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 })
    }

    return NextResponse.json({ bookmark: data })
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postId, updates } = body

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(updates)
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .select()
      .single()

    if (error) {
      console.error("Error updating bookmark:", error)
      return NextResponse.json({ error: "Failed to update bookmark" }, { status: 500 })
    }

    return NextResponse.json({ bookmark: data })
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")
    const postIds = searchParams.get("postIds")?.split(",")

    if (!postId && !postIds) {
      return NextResponse.json({ error: "Post ID(s) required" }, { status: 400 })
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
      return NextResponse.json({ error: "Failed to remove bookmark(s)" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
