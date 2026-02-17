// Admin comments moderation endpoint.
// Migration note: canonical comment domain logic is centralized in lib/comments/service.ts.

import { type NextRequest, NextResponse } from "next/server"
import { REVALIDATION_SECRET } from "@/config/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { adminUpdateCommentService, listAdminCommentsService } from "@/lib/comments/service"

export async function GET(request: NextRequest) {
  const adminToken = request.headers.get("x-admin-token")
  if (adminToken !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const status = request.nextUrl.searchParams.get("status") || "all"

  try {
    const comments = await listAdminCommentsService(createAdminClient(), status)

    return NextResponse.json(
      comments.map((comment) => ({
        id: comment.id,
        wp_post_id: Number(comment.wp_post_id),
        content: comment.body,
        created_by: comment.user_id,
        edition: comment.edition_code,
        status: comment.status,
        created_at: comment.created_at,
      })),
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const adminToken = request.headers.get("x-admin-token")
  if (adminToken !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const commentId = request.nextUrl.searchParams.get("id")
  const body = await request.json()

  if (!commentId) {
    return NextResponse.json({ error: "Missing comment id" }, { status: 400 })
  }

  try {
    await adminUpdateCommentService(createAdminClient(), commentId, body)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 })
  }
}
