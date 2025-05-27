import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

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

    const { data: bookmarks, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bookmarks:", error)
      return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 })
    }

    return NextResponse.json({ bookmarks })
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
    const { postId, title, slug, excerpt, featuredImage } = body

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
      featured_image: featuredImage ? JSON.stringify(featuredImage) : null, // Using snake_case
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

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId)

    if (error) {
      console.error("Error removing bookmark:", error)
      return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in bookmarks API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
