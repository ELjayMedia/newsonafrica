// Admin API: Update Single Comment (Service Role Only)
// Canonical moderation backend: Supabase comments service via lib/comments/service.ts.

import { type NextRequest, NextResponse } from "next/server"
import { REVALIDATION_SECRET } from "@/config/env"
import { revalidateTag } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeCommentStatus } from "@/lib/comments/moderation-status"
import { adminUpdateCommentService } from "@/lib/comments/service"

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
    const result = await adminUpdateCommentService(createAdminClient(), id, updates)
    revalidateTag(result.cacheTag)

    return NextResponse.json({
      id: result.comment.id,
      wp_post_id: Number(result.comment.wp_post_id),
      content: result.comment.body,
      created_by: result.comment.user_id,
      edition: result.comment.edition_code,
      status: result.comment.status,
      created_at: result.comment.created_at,
    })
  } catch {
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 })
  }
}
