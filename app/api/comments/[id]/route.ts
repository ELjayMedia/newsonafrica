import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { createSupabaseRouteClient } from "@/utils/supabase/route-client"

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

type CommentRouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>
}

// Update a comment
export async function PATCH(request: NextRequest, context: CommentRouteContext) {
  logRequest(request)
  const params = await context.params
  const rawCommentId = params?.id
  const commentId = Array.isArray(rawCommentId) ? rawCommentId[0] : rawCommentId

  if (!commentId) {
    return jsonWithCors(request, { error: "Comment ID is required" }, { status: 400 })
  }

  const supabase = createSupabaseRouteClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return jsonWithCors(request, { error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { content } = await request.json()

    if (!content) {
      return jsonWithCors(request, { error: "Content is required" }, { status: 400 })
    }

    // First check if the user owns this comment
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id, status")
      .eq("id", commentId)
      .single()

    if (fetchError) {
      console.error("Error fetching comment:", fetchError)
      return jsonWithCors(request, { error: "Failed to fetch comment" }, { status: 500 })
    }

    if (!comment) {
      return jsonWithCors(request, { error: "Comment not found" }, { status: 404 })
    }

    // Verify ownership
    if (comment.user_id !== session.user.id) {
      return jsonWithCors(request, { error: "Unauthorized" }, { status: 403 })
    }

    // Check if comment is deleted or flagged
    if (comment.status !== "active") {
      return jsonWithCors(
        request,
        {
          error: `Cannot edit a comment with status: ${comment.status}`,
        },
        { status: 400 },
      )
    }

    // Update the comment
    const { data, error } = await supabase.from("comments").update({ content }).eq("id", commentId).select().single()

    if (error) {
      console.error("Error updating comment:", error)
      return jsonWithCors(request, { error: "Failed to update comment" }, { status: 500 })
    }

    // Fetch the profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      // Return the comment without profile data
      return jsonWithCors(request, data)
    }

    // Return the updated comment with profile data
    revalidateByTag(CACHE_TAGS.COMMENTS)
    return NextResponse.json({
      ...data,
      profile: {
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    })
  } catch (error) {
    console.error("Error updating comment:", error)
    return jsonWithCors(request, { error: "Failed to update comment" }, { status: 500 })
  }
}

// Delete a comment
export async function DELETE(request: NextRequest, context: CommentRouteContext) {
  logRequest(request)
  const params = await context.params
  const rawCommentId = params?.id
  const commentId = Array.isArray(rawCommentId) ? rawCommentId[0] : rawCommentId

  if (!commentId) {
    return jsonWithCors(request, { error: "Comment ID is required" }, { status: 400 })
  }

  const supabase = createSupabaseRouteClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return jsonWithCors(request, { error: "Unauthorized" }, { status: 401 })
  }

  try {
    // First check if the user owns this comment
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .single()

    if (fetchError) {
      console.error("Error fetching comment:", fetchError)
      return jsonWithCors(request, { error: "Failed to fetch comment" }, { status: 500 })
    }

    if (!comment) {
      return jsonWithCors(request, { error: "Comment not found" }, { status: 404 })
    }

    // Verify ownership
    if (comment.user_id !== session.user.id) {
      return jsonWithCors(request, { error: "Unauthorized" }, { status: 403 })
    }

    // Soft delete the comment by updating its status
    const { error } = await supabase.from("comments").update({ status: "deleted" }).eq("id", commentId)

    if (error) {
      console.error("Error deleting comment:", error)
      return jsonWithCors(request, { error: "Failed to delete comment" }, { status: 500 })
    }

    revalidateByTag(CACHE_TAGS.COMMENTS)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return jsonWithCors(request, { error: "Failed to delete comment" }, { status: 500 })
  }
}
