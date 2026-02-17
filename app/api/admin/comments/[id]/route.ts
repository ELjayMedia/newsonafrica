// Admin API: Update Single Comment (Service Role Only)
// ====================================================

import { type NextRequest, NextResponse } from "next/server"
import { REVALIDATION_SECRET } from "@/config/env"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"
import { PostgRESTError } from "@/lib/supabase/rest/errors"
import { normalizeCommentStatus } from "@/lib/comments/moderation-status"
import { updateCommentServerOnly } from "@/lib/supabase/rest/server/comments"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const adminToken = request.headers.get("x-admin-token")
  if (adminToken !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id } = params

  const updates = { ...body }
  if (typeof updates.status === "string") {
    try {
      updates.status = normalizeCommentStatus(updates.status)
    } catch {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
  }

  try {
    const comment = await updateCommentServerOnly({ id, updates })

    revalidateTag(cacheTags.comments(comment.edition_code, comment.wp_post_id))

    return NextResponse.json({
      id: comment.id,
      wp_post_id: Number(comment.wp_post_id),
      content: comment.body,
      created_by: comment.user_id,
      edition: comment.edition_code,
      status: comment.status,
      created_at: comment.created_at,
    })
  } catch (error) {
    if (error instanceof PostgRESTError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 })
  }
}
