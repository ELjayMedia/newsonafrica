import { NextResponse } from "next/server"
import { getAuthTokenFromCookies } from "@/lib/cookies"
import { getCurrentUser } from "@/lib/auth"
import { WORDPRESS_REST_URL } from "@/lib/wordpress/client"

export async function GET(request: Request) {
  const token = getAuthTokenFromCookies()

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  try {
    const userData = await getCurrentUser(token)
    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        avatar_urls: userData.avatar_urls,
      },
    })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const token = getAuthTokenFromCookies()

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userData = await request.json()
    const response = await fetch(`${WORDPRESS_REST_URL}/wp/v2/users/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      throw new Error("Failed to update user profile")
    }

    const updatedUser = await response.json()
    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 })
  }
}
