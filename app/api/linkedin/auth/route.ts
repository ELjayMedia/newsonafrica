import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get the redirect URL from the query parameters
  const searchParams = request.nextUrl.searchParams
  const redirectUrl = searchParams.get("redirect_uri") || "/"
  const popupMode = searchParams.get("popup") === "true"

  // LinkedIn OAuth URL with state parameter containing redirect info and popup flag
  const state = JSON.stringify({
    redirectUrl,
    popupMode,
  })

  // Only use the server-side environment variable
  const linkedInApiKey = process.env.LINKEDIN_API_KEY

  if (!linkedInApiKey) {
    console.error("LinkedIn API key is not configured")
    return NextResponse.redirect(new URL("/auth/error?message=LinkedIn+API+not+configured", request.url))
  }

  const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
    linkedInApiKey
  }&redirect_uri=${encodeURIComponent(
    process.env.SITE_URL + "/api/linkedin/callback",
  )}&state=${encodeURIComponent(state)}&scope=r_liteprofile%20r_emailaddress%20w_member_social`

  // Redirect to LinkedIn OAuth
  return NextResponse.redirect(linkedInAuthUrl)
}
