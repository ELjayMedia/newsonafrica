import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { createSupabaseRouteClient } from "@/utils/supabase/route-client"
import type { Database } from "@/types/supabase"

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
    const { content }: { content?: string } = await request.json()
    const sanitizedContent = content?.trim()

    if (!sanitizedContent) {
      return jsonWithCors(request, { error: "Content is required" }, { status: 400 })
    }

    // First check if the user owns this comment
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id, status")
      .eq("id", commentId)
      .single<{ user_id: string; status: string }>()

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
    const updatePayload = {
      content: sanitizedContent,
    } satisfies Database["public"]["Tables"]["comments"]["Update"]

    type CommentRow = Database["public"]["Tables"]["comments"]["Row"]

    const { data, error } = await supabase
      .from("comments")
      .update(updatePayload as never)
      .eq("id", commentId)
      .select()
      .single<CommentRow>()

    if (error) {
      console.error("Error updating comment:", error)
      return jsonWithCors(request, { error: "Failed to update comment" }, { status: 500 })
    }

    if (!data) {
      return jsonWithCors(request, { error: "Failed to update comment" }, { status: 500 })
    }

    // Fetch the profile data
    type ProfilePreview = { username: string | null; avatar_url: string | null }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", session.user.id)
      .single<ProfilePreview>()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      // Return the comment without profile data
      return jsonWithCors(request, data)
    }

    // Return the updated comment with profile data
    revalidateByTag(CACHE_TAGS.COMMENTS)
    const responsePayload = {
      ...data,
      profile: {
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    }

    return NextResponse.json(responsePayload)
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
    type CommentOwner = { user_id: string }

    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .single<CommentOwner>()

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
    const deletionPayload = {
      status: "deleted",
    } satisfies Database["public"]["Tables"]["comments"]["Update"]

    const { error } = await supabase
      .from("comments")
      .update(deletionPayload as never)
      .eq("id", commentId)

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
