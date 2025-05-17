import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const returnTo = searchParams.get("returnTo") || "/"

  // Use the server-side environment variable
  const clientId = process.env.LINKEDIN_API_KEY

  if (!clientId) {
    return NextResponse.json({ error: "LinkedIn API not configured" }, { status: 500 })
  }

  // Generate a random state value for CSRF protection
  const state = Math.random().toString(36).substring(2, 15)

  // Store the state and returnTo in cookies
  const response = NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/linkedin/callback`,
    )}&state=${state}&scope=r_liteprofile%20r_emailaddress%20w_member_social`,
  )

  // Set cookies for state verification and return path
  response.cookies.set("linkedin_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  })

  response.cookies.set("linkedin_auth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  })

  return response
}
