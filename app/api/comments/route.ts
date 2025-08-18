import type { NextRequest } from "next/server"
import env from "@/lib/config/env";
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from "zod"
import { applyRateLimit, handleApiError, successResponse } from "@/lib/api-utils"

// Input validation schemas
const getCommentsSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  page: z.coerce.number().nonnegative().default(0),
  limit: z.coerce.number().positive().max(50).default(10),
  parentId: z.string().optional().nullable(),
  status: z.enum(["active", "pending", "flagged", "deleted", "all"]).default("active"),
})

const createCommentSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  content: z.string().min(1, "Comment content is required").max(2000, "Comment is too long"),
  parentId: z.string().optional().nullable(),
})

// Get comments for a post with pagination
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 30, "COMMENTS_GET_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const cookieStore = cookies()
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    const params = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const { postId, page, limit, parentId, status } = getCommentsSchema.parse(params)

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
      throw new Error(`Failed to fetch comments: ${error.message}`)
    }

    if (!comments || comments.length === 0) {
      return successResponse({
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
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`)
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

    return successResponse(
      {
        comments: commentsWithProfiles,
        totalCount,
        hasMore,
      },
      {
        pagination: {
          page,
          limit,
          from,
          to,
        },
      },
    )
  } catch (error) {
    return handleApiError(error)
  }
}

// Create a new comment
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 5, "COMMENTS_POST_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const cookieStore = cookies()
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      return handleApiError(new Error("Unauthorized"))
    }

    const body = await request.json()

    // Validate request body
    const { postId, content, parentId } = createCommentSchema.parse(body)

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
        return handleApiError(
          new Error(
            `Rate limited. Please wait ${Math.ceil((10000 - timeDiff) / 1000)} seconds before commenting again.`,
          ),
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
      throw new Error(`Failed to create comment: ${error.message}`)
    }

    // Fetch the profile for this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      // Still return the comment, just without profile data
      return successResponse(comment)
    }

    // Return the comment with profile data
    return successResponse({
      ...comment,
      profile: {
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// Update comment status (report, delete, approve)
export async function PATCH(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "COMMENTS_PATCH_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const cookieStore = cookies()
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      return handleApiError(new Error("Unauthorized"))
    }

    const updateCommentSchema = z.object({
      id: z.string().min(1, "Comment ID is required"),
      action: z.enum(["report", "delete", "approve"]),
      reason: z.string().optional(),
    })

    const body = await request.json()

    // Validate request body
    const { id, action, reason } = updateCommentSchema.parse(body)

    if (action === "report" && !reason) {
      return handleApiError(new Error("Report reason is required"))
    }

    // Check if the comment exists
    const { data: comment, error: fetchError } = await supabase.from("comments").select("*").eq("id", id).single()

    if (fetchError) {
      return handleApiError(new Error("Comment not found"))
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
          return handleApiError(new Error("You can only delete your own comments"))
        }
        updateData = { status: "deleted" }
        break
      case "approve":
        // Check if user is a moderator (implement your own logic)
        // For now, we'll just check if the user is the author
        if (comment.user_id !== session.user.id) {
          return handleApiError(new Error("You don't have permission to approve this comment"))
        }
        updateData = {
          status: "active",
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        }
        break
    }

    // Update the comment
    const { error } = await supabase.from("comments").update(updateData).eq("id", id)

    if (error) {
      throw new Error(`Failed to ${action} comment: ${error.message}`)
    }

    return successResponse({ success: true, action })
  } catch (error) {
    return handleApiError(error)
  }
}
