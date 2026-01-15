// Admin API: Comments Moderation (Service Role Only)
// ===================================================
// CONTRACT: Service role bypasses RLS, retrieves ALL comments for admin review

import { type NextRequest, NextResponse } from "next/server"
import { REVALIDATION_SECRET } from "@/config/env"
import { PostgRESTError } from "@/lib/supabase/rest/errors"
import { listCommentsForModerationServerOnly, updateCommentServerOnly } from "@/lib/supabase/rest/server/comments"

export async function GET(request: NextRequest) {
  // Verify admin access (implement your own auth)
  const adminToken = request.headers.get("x-admin-token")
  if (adminToken !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const status = request.nextUrl.searchParams.get("status") || "all"

  try {
    const comments = await listCommentsForModerationServerOnly({ status })

    const responsePayload = comments.map((comment) => ({
      id: comment.id,
      wp_post_id: Number(comment.wp_post_id),
      content: comment.body,
      created_by: comment.user_id,
      edition: comment.edition_code,
      status: comment.status,
      created_at: comment.created_at,
    }))

    return NextResponse.json(responsePayload)
  } catch (error) {
    if (error instanceof PostgRESTError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  // Verify admin access
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
    await updateCommentServerOnly({ id: commentId, updates: body })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PostgRESTError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 })
  }
}
