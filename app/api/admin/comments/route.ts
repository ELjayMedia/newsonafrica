// Admin API: Comments Moderation (Service Role Only)
// ===================================================
// CONTRACT: Service role bypasses RLS, retrieves ALL comments for admin review

import { type NextRequest, NextResponse } from "next/server"
import { REVALIDATION_SECRET } from "@/config/env"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  // Verify admin access (implement your own auth)
  const adminToken = request.headers.get("x-admin-token")
  if (adminToken !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const status = request.nextUrl.searchParams.get("status") || "all"

  const params = new URLSearchParams({
    select: "id,wp_post_id,created_by,content,edition,status,created_at",
    order: "created_at.desc",
    limit: "100",
  })

  if (status !== "all") {
    params.append("status", `eq.${status}`)
  }

  const url = `${SUPABASE_URL}/rest/v1/comments?${params.toString()}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: response.status })
  }

  const comments = await response.json()
  return NextResponse.json(comments)
}

export async function PATCH(request: NextRequest) {
  // Verify admin access
  const adminToken = request.headers.get("x-admin-token")
  if (adminToken !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const commentId = request.nextUrl.searchParams.get("id")
  const body = await request.json()

  const url = `${SUPABASE_URL}/rest/v1/comments?id=eq.${commentId}`

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to update comment" }, { status: response.status })
  }

  return NextResponse.json({ success: true })
}
