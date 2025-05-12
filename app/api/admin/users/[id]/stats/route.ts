import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Get the current user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Get user with their role from the database
  const { data: userData, error: userError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (userError || !userData) {
    console.error("Error fetching user role:", userError)
    return NextResponse.json({ error: "Failed to verify user permissions" }, { status: 500 })
  }

  // Check if user has admin role
  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Admin privileges required" }, { status: 403 })
  }

  try {
    // Get bookmarks count
    const { count: bookmarksCount, error: bookmarksError } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id)

    if (bookmarksError) {
      console.error("Error fetching bookmarks count:", bookmarksError)
    }

    // Get comments count
    const { count: commentsCount, error: commentsError } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id)

    if (commentsError) {
      console.error("Error fetching comments count:", commentsError)
    }

    // Get recent activity (last 5 actions)
    const { data: recentBookmarks, error: recentBookmarksError } = await supabase
      .from("bookmarks")
      .select("created_at, title, post_id, slug")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(3)

    if (recentBookmarksError) {
      console.error("Error fetching recent bookmarks:", recentBookmarksError)
    }

    const { data: recentComments, error: recentCommentsError } = await supabase
      .from("comments")
      .select("created_at, content, post_id")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(3)

    if (recentCommentsError) {
      console.error("Error fetching recent comments:", recentCommentsError)
    }

    // Combine and sort recent activity
    const recentActivity = [
      ...(recentBookmarks || []).map((item) => ({
        type: "bookmark",
        created_at: item.created_at,
        content: item.title,
        post_id: item.post_id,
        slug: item.slug,
      })),
      ...(recentComments || []).map((item) => ({
        type: "comment",
        created_at: item.created_at,
        content: item.content,
        post_id: item.post_id,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return NextResponse.json({
      stats: {
        bookmarks: bookmarksCount || 0,
        comments: commentsCount || 0,
      },
      recentActivity,
    })
  } catch (error: any) {
    console.error("Error fetching user statistics:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch user statistics",
      },
      { status: 500 },
    )
  }
}
