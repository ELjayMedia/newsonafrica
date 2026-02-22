import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { cacheTags } from "@/lib/cache/cacheTags"
import { AFRICAN_EDITION } from "@/lib/editions"
import { normalizeEditionCode, type CommentAction } from "./validators"

interface CreateCommentParams {
  wpPostId: string
  editionCode: string
  userId: string
  body: string
  parentId: string | null
}

export async function createComment(supabase: SupabaseClient<Database>, params: CreateCommentParams) {
  const { wpPostId, editionCode, userId, body, parentId } = params

  const newComment: Database["public"]["Tables"]["comments"]["Insert"] = {
    wp_post_id: wpPostId,
    edition_code: editionCode,
    user_id: userId,
    body,
    parent_id: parentId,
    status: "active",
  }

  const { data: comment, error } = await supabase.from("comments").insert(newComment).select().single()

  if (error) {
    throw new Error(`Failed to create comment: ${error.message}`)
  }

  return comment
}

interface UpdateCommentActionParams {
  id: string
  action: CommentAction
  reason?: string
  userId: string
}

type ActionHandler = (params: UpdateCommentActionParams) => {
  updateData: Record<string, unknown>
  requireOwner: boolean
  requireModerator: boolean
}

const actionHandlers: Record<CommentAction, ActionHandler> = {
  report: ({ userId, reason }) => ({
    updateData: {
      status: "flagged",
      reported_by: userId,
      report_reason: reason,
    },
    requireOwner: false,
    requireModerator: false,
  }),
  delete: () => ({
    updateData: { status: "deleted" },
    requireOwner: true,
    requireModerator: false,
  }),
  approve: ({ userId }) => ({
    updateData: {
      status: "active",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    },
    requireOwner: false,
    requireModerator: true,
  }),
}

export async function updateCommentAction(
  supabase: SupabaseClient<Database>,
  params: UpdateCommentActionParams,
): Promise<{ success: boolean; tagToRevalidate?: string }> {
  const { id, action, userId } = params

  // Fetch the comment
  const { data: comment, error: fetchError } = await supabase.from("comments").select("*").eq("id", id).single()

  if (fetchError || !comment) {
    throw new Error("Comment not found")
  }

  const commentRecord = comment as {
    user_id?: string | null
    wp_post_id?: string | number | null
    edition_code?: string | null
  }

  const handler = actionHandlers[action]
  const { updateData, requireOwner, requireModerator } = handler(params)

  // Check permissions
  if (requireOwner && commentRecord.user_id !== userId) {
    throw new Error("You can only delete your own comments")
  }

  if (requireModerator && commentRecord.user_id !== userId) {
    // For now, only allow the author to approve their own comments
    // In the future, implement moderator check
    throw new Error("You don't have permission to approve this comment")
  }

  // Update the comment
  const { error } = await supabase.from("comments").update(updateData).eq("id", id)

  if (error) {
    throw new Error(`Failed to ${action} comment: ${error.message}`)
  }

  const targetEdition = normalizeEditionCode(commentRecord.edition_code ?? null) ?? AFRICAN_EDITION.code
  const targetPostId = commentRecord.wp_post_id != null ? String(commentRecord.wp_post_id) : null

  return {
    success: true,
    tagToRevalidate: targetPostId ? cacheTags.comments(targetEdition, targetPostId) : undefined,
  }
}
