import { type NextRequest, NextResponse } from "next/server"
import env from "@/lib/config/env";

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

  const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
    env.LINKEDIN_API_KEY
  }&redirect_uri=${encodeURIComponent(
    env.NEXT_PUBLIC_SITE_URL + "/api/linkedin/callback",
  )}&state=${encodeURIComponent(state)}&scope=r_liteprofile%20r_emailaddress%20w_member_social`

  // Redirect to LinkedIn OAuth
  return NextResponse.redirect(linkedInAuthUrl)
}
