import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { CACHE_DURATIONS, CACHE_TAGS, revalidateByTag } from "@/lib/cache-utils"

// Cache policy: short (1 minute)
export const revalidate = CACHE_DURATIONS.SHORT

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
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")
    const category = searchParams.get("category")
    const status = searchParams.get("status") // 'read' | 'unread'
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

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

    // Calculate stats
    const { data: statsData } = await supabase.from("bookmarks").select("read_status, category").eq("user_id", user.id)

    const stats = {
      total: count || 0,
      unread: statsData?.filter((b) => b.read_status !== "read").length || 0,
      categories:
        statsData?.reduce(
          (acc, b) => {
            if (b.category) {
              acc[b.category] = (acc[b.category] || 0) + 1
            }
            return acc
          },
          {} as Record<string, number>,
        ) || {},
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
    const { postId, title, slug, excerpt, featuredImage, category, tags, notes, country } = body

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
      country: country || null,
      title: title || "Untitled Post",
      slug: slug || "",
      excerpt: excerpt || "",
      featured_image:
        featuredImage && typeof featuredImage === "object" ? featuredImage : null,
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

      revalidateByTag(CACHE_TAGS.BOOKMARKS)
    revalidatePath("/bookmarks")
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
      return NextResponse.json({ error: "Failed to update bookmark" }, { status: 500 })
    }

      revalidateByTag(CACHE_TAGS.BOOKMARKS)
    revalidatePath("/bookmarks")
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

      revalidateByTag(CACHE_TAGS.BOOKMARKS)
    revalidatePath("/bookmarks")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
