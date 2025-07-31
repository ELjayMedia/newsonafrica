import { NextResponse } from "next/server"
import { getAuthTokenFromCookies } from "@/lib/cookies"
import { WORDPRESS_REST_URL } from "@/lib/wordpress/client"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const token = getAuthTokenFromCookies()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const commentId = params.id

  const response = await fetch(`${WORDPRESS_REST_URL}/wp/v2/comments/${commentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "approved" }),
  })

  if (response.ok) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ error: "Failed to approve comment" }, { status: 500 })
  }
}
