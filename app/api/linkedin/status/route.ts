import logger from "@/utils/logger";
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get the LinkedIn access token from the cookie
  const linkedInToken = request.cookies.get("linkedin_token")?.value

  if (!linkedInToken) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    // Verify the token is still valid
    const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${linkedInToken}`,
      },
    })

    if (!profileResponse.ok) {
      // Token is invalid or expired
      return NextResponse.json({ authenticated: false })
    }

    const profile = await profileResponse.json()
    return NextResponse.json({
      authenticated: true,
      profile: {
        id: profile.id,
        firstName: profile.localizedFirstName,
        lastName: profile.localizedLastName,
      },
    })
  } catch (error) {
    logger.error("LinkedIn status check error:", error)
    return NextResponse.json({ authenticated: false })
  }
}
