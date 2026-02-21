import { revalidateTag } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeCommentStatus } from "@/lib/comments/moderation-status"
import { adminUpdateCommentService } from "@/lib/comments/service"
import { makeRoute, routeData, routeError } from "@/lib/api/route-helpers"

type AdminCommentRouteContext = {
  params: { id: string }
}

const ADMIN_ROUTE = makeRoute<AdminCommentRouteContext>({ auth: "admin", useSupabase: false, applyCookies: false })

export const PATCH = ADMIN_ROUTE(async (_ctx, { params }) => {
  const { id } = params

  const body = await _ctx.request.json()
  const updates = { ...body }
  if (typeof updates.status === "string") {
    try {
      updates.status = normalizeCommentStatus(updates.status)
    } catch {
      return routeError("Invalid status", { status: 400 })
    }
  }

  try {
    const result = await adminUpdateCommentService(createAdminClient(), id, updates)
    revalidateTag(result.cacheTag)

    return routeData({
      id: result.comment.id,
      wp_post_id: Number(result.comment.wp_post_id),
      content: result.comment.body,
      created_by: result.comment.user_id,
      edition: result.comment.edition_code,
      status: result.comment.status,
      created_at: result.comment.created_at,
    })
  } catch {
    return routeError("Failed to update comment", { status: 500 })
  }
})
