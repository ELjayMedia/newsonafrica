import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const accessToken = request.headers.get("x-linkedin-token")

  if (!accessToken) {
    return NextResponse.json({ authenticated: false, message: "No access token provided" })
  }

  try {
    // Verify the token by making a request to LinkedIn API
    const response = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ authenticated: false, message: "Invalid or expired token" })
    }

    const profileData = await response.json()
    return NextResponse.json({
      authenticated: true,
      profile: {
        id: profileData.id,
        firstName: profileData.localizedFirstName,
        lastName: profileData.localizedLastName,
      },
    })
  } catch (error) {
    console.error("LinkedIn status check error:", error)
    return NextResponse.json({ authenticated: false, message: (error as Error).message }, { status: 500 })
  }
}
