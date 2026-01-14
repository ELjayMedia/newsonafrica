// Admin API: Update Single Comment (Service Role Only)
// ====================================================

import { type NextRequest, NextResponse } from "next/server"
import { REVALIDATION_SECRET } from "@/config/env"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const adminToken = request.headers.get("x-admin-token")
  if (adminToken !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id } = params

  const url = `${SUPABASE_URL}/rest/v1/comments?id=eq.${id}`

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to update comment" }, { status: response.status })
  }

  const data = await response.json()
  const comment = data[0]

  revalidateTag(cacheTags.comments(comment.wp_post_id, comment.edition))

  return NextResponse.json(comment)
}
