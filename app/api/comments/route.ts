import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Get comments for a post with pagination
export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    },
  )

  const { searchParams } = new URL(request.url)
  const postId = searchParams.get("postId")
  const page = Number.parseInt(searchParams.get("page") || "0", 10)
  const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
  const parentId = searchParams.get("parentId") || null
  const status = searchParams.get("status") || "active"

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
  }

  try {
    // Calculate pagination range
    const from = page * limit
    const to = from + limit - 1

    // Build query
    let query = supabase.from("comments").select("*", { count: "exact" }).eq("post_id", postId)

    // Filter by parent_id
    if (parentId === null) {
      query = query.is("parent_id", null)
    } else if (parentId) {
      query = query.eq("parent_id", parentId)
    }

    // Filter by status if not 'all'
    if (status !== "all") {
      // For non-authenticated users, only show active comments
      // For authenticated users, show their own comments regardless of status
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        query = query.or(`status.eq.${status},user_id.eq.${session.user.id}`)
      } else {
        query = query.eq("status", status)
      }
    }

    // Add pagination and ordering
    const { data: comments, error, count } = await query.order("created_at", { ascending: false }).range(from, to)

    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({
        comments: [],
        totalCount: 0,
        hasMore: false,
      })
    }

    // Extract all user IDs from comments
    const userIds = [...new Set(comments.map((comment) => comment.user_id))]

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds)

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch user profiles" }, { status: 500 })
    }

    // Create a map of user_id to profile data
    const profileMap = new Map()
    profiles?.forEach((profile) => {
      profileMap.set(profile.id, profile)
    })

    // Combine comments with profile data
    const commentsWithProfiles = comments.map((comment) => {
      const profile = profileMap.get(comment.user_id)
      return {
        ...comment,
        profile: profile
          ? {
              username: profile.username,
              avatar_url: profile.avatar_url,
            }
          : undefined,
      }
    })

    // Check if there are more comments to load
    const hasMore = count ? from + limit < count : false
    const totalCount = count || 0

    return NextResponse.json(
      {
        comments: commentsWithProfiles,
        totalCount,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("Error processing comments:", error)
    return NextResponse.json({ error: "Failed to process comments" }, { status: 500 })
  }
}

// Create a new comment
export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    },
  )

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { postId, content, parentId } = await request.json()

    if (!postId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Rate limiting check - get user's last comment timestamp
    const { data: lastComment, error: lastCommentError } = await supabase
      .from("comments")
      .select("created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!lastCommentError && lastComment) {
      const lastCommentTime = new Date(lastComment.created_at).getTime()
      const currentTime = Date.now()
      const timeDiff = currentTime - lastCommentTime

      // Rate limit: 10 seconds between comments
      if (timeDiff < 10000) {
        return NextResponse.json(
          {
            error: "Rate limited",
            retryAfter: Math.ceil((10000 - timeDiff) / 1000),
          },
          { status: 429 },
        )
      }
    }

    const newComment = {
      post_id: postId,
      user_id: session.user.id,
      content,
      parent_id: parentId || null,
      status: "active",
    }

    // Insert the comment
    const { data: comment, error } = await supabase.from("comments").insert(newComment).select().single()

    if (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
    }

    // Fetch the profile for this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      // Still return the comment, just without profile data
      return NextResponse.json(comment)
    }

    // Return the comment with profile data
    return NextResponse.json({
      ...comment,
      profile: {
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}

// Report a comment
export async function PATCH(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    },
  )

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, action, reason } = await request.json()

    if (!id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (action === "report" && !reason) {
      return NextResponse.json({ error: "Report reason is required" }, { status: 400 })
    }

    // Check if the comment exists
    const { data: comment, error: fetchError } = await supabase.from("comments").select("*").eq("id", id).single()

    if (fetchError) {
      console.error("Error fetching comment:", fetchError)
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    let updateData = {}

    switch (action) {
      case "report":
        updateData = {
          status: "flagged",
          reported_by: session.user.id,
          report_reason: reason,
        }
        break
      case "delete":
        // Only allow the author to delete their own comment
        if (comment.user_id !== session.user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
        updateData = { status: "deleted" }
        break
      case "approve":
        // Check if user is a moderator (implement your own logic)
        // For now, we'll just check if the user is the author
        if (comment.user_id !== session.user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
        updateData = {
          status: "active",
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        }
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Update the comment
    const { error } = await supabase.from("comments").update(updateData).eq("id", id)

    if (error) {
      console.error(`Error ${action}ing comment:`, error)
      return NextResponse.json({ error: `Failed to ${action} comment` }, { status: 500 })
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error("Error processing comment action:", error)
    return NextResponse.json({ error: "Failed to process comment action" }, { status: 500 })
  }
}
