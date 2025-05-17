// Update the LinkedIn callback route to use the server-side environment variable

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  // Get the stored state from cookies for CSRF protection
  const storedState = request.cookies.get("linkedin_auth_state")?.value
  const returnTo = request.cookies.get("linkedin_auth_return_to")?.value || "/"

  // Verify state to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth?error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth?error=missing_code`)
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINKEDIN_API_KEY || "",
        client_secret: process.env.LINKEDIN_API_SECRET || "",
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/linkedin/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token")
    }

    const tokenData = await tokenResponse.json()

    // Create response with the access token in a client-accessible cookie
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${returnTo}`)

    // Set the token in a client-accessible cookie (not httpOnly)
    response.cookies.set("linkedin_access_token", tokenData.access_token, {
      httpOnly: false, // Client needs to access this
      secure: process.env.NODE_ENV === "production",
      maxAge: tokenData.expires_in,
      path: "/",
    })

    // Clear the state and returnTo cookies
    response.cookies.set("linkedin_auth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    })

    response.cookies.set("linkedin_auth_return_to", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("LinkedIn auth error:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/auth?error=${encodeURIComponent((error as Error).message)}`,
    )
  }
}
