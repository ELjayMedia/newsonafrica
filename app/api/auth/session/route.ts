import logger from "@/utils/logger";
import env from "@/lib/config/env";
import { NextResponse } from "next/server"
import { getAuthTokenFromCookies } from "@/lib/cookies"

const WP_API_URL = env.WORDPRESS_API_URL

export async function GET() {
  const token = getAuthTokenFromCookies()

  if (!token) {
    return NextResponse.json({ user: null })
  }

  try {
    const response = await fetch(`${WP_API_URL}/wp/v2/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user data")
    }

    const userData = await response.json()

    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        avatar_urls: userData.avatar_urls,
      },
    })
  } catch (error) {
    logger.error("Session error:", error)
    return NextResponse.json({ user: null })
  }
}
