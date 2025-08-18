import logger from "@/utils/logger";
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")

  let state = { redirectUrl: "/", popupMode: false }

  try {
    if (stateParam) {
      state = JSON.parse(decodeURIComponent(stateParam))
    }
  } catch (e) {
    logger.error("Error parsing state parameter:", e)
  }

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
    const response = state.popupMode
      ? NextResponse.html(
          `<html><body><script>window.opener && window.opener.postMessage("linkedin-auth-success", "*"); window.close();</script><p>Authentication successful! You can close this window.</p></body></html>`,
        )
      : NextResponse.redirect(new URL(state.redirectUrl || "/", request.url))

    response.cookies.set("linkedin_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenData.expires_in,
      path: "/",
    })

    return response
  } catch (error) {
    logger.error("LinkedIn OAuth error:", error)

    if (state.popupMode) {
      return NextResponse.html(
        `<html><body><script>window.opener && window.opener.postMessage("linkedin-auth-error", "*"); window.close();</script><p>Authentication failed. You can close this window.</p></body></html>`,
      )
    }

    return NextResponse.redirect(new URL("/auth/error?message=LinkedIn+authentication+failed", request.url))
  }
}
