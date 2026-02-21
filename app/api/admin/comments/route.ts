import { type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  normalizeCommentModerationFilter,
  normalizeCommentStatus,
  type ModerationFilterStatus,
} from "@/lib/comments/moderation-status"
import { adminUpdateCommentService, listAdminCommentsService } from "@/lib/comments/service"
import { makeRoute, routeData, routeError } from "@/lib/api/route-helpers"

const ADMIN_ROUTE = makeRoute({ auth: "admin", useSupabase: false, applyCookies: false })

const toAdminCommentDto = (comment: {
  id: string
  wp_post_id: string
  body: string
  user_id: string
  edition_code: string
  status: string
  created_at: string
}) => ({
  id: comment.id,
  wp_post_id: Number(comment.wp_post_id),
  content: comment.body,
  created_by: comment.user_id,
  edition: comment.edition_code,
  status: comment.status,
  created_at: comment.created_at,
})

export const GET = ADMIN_ROUTE(async ({ request }) => {
  const rawStatus = request.nextUrl.searchParams.get("status") || "all"

  let status: ModerationFilterStatus
  try {
    status = normalizeCommentModerationFilter(rawStatus)
  } catch {
    return routeError("Invalid status filter", { status: 400 })
  }

  try {
    const comments = await listAdminCommentsService(createAdminClient(), status)
    return routeData(comments.map(toAdminCommentDto))
  } catch {
    return routeError("Failed to fetch comments", { status: 500 })
  }
})

export const PATCH = ADMIN_ROUTE(async ({ request }) => {
  const commentId = request.nextUrl.searchParams.get("id")
  const body = await request.json()

  const updates = { ...body }
  if (typeof updates.status === "string") {
    try {
      updates.status = normalizeCommentStatus(updates.status)
    } catch {
      return routeError("Invalid status", { status: 400 })
    }
  }

  if (!commentId) {
    return routeError("Missing comment id", { status: 400 })
  }

  try {
    await adminUpdateCommentService(createAdminClient(), commentId, updates)
    return routeData({ success: true })
  } catch {
    return routeError("Failed to update comment", { status: 500 })
  }
})
