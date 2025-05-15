import { type NextRequest, NextResponse } from "next/server"

const WP_API_URL = process.env.WORDPRESS_API_URL

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Send password reset request through WordPress
    const response = await fetch(`${WP_API_URL}/wp/v2/users/lost-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_login: email }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Password reset request failed")
    }

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully.",
    })
  } catch (error) {
    return NextResponse.json({ message: error.message || "Password reset request failed" }, { status: 400 })
  }
}
