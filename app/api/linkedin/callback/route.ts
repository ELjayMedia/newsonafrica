import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state") // This contains our redirect URL

  if (!code) {
    return NextResponse.redirect(new URL("/auth/error?message=No+authorization+code+received", request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/linkedin/callback`,
        client_id: process.env.LINKEDIN_API_KEY || "",
        client_secret: process.env.LINKEDIN_API_SECRET || "",
      }).toString(),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token")
    }

    const tokenData = await tokenResponse.json()

    // Store token in a secure HTTP-only cookie
    const response = NextResponse.redirect(new URL(state || "/", request.url))
    response.cookies.set("linkedin_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenData.expires_in,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("LinkedIn OAuth error:", error)
    return NextResponse.redirect(new URL("/auth/error?message=LinkedIn+authentication+failed", request.url))
  }
}
