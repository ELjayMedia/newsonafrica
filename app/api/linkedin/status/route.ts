import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const token = request.cookies.get("linkedin_token")?.value

  if (!token) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    // Verify token is still valid by making a simple API call
    const response = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Token is invalid or expired
      const newResponse = NextResponse.json({ authenticated: false })
      newResponse.cookies.delete("linkedin_token")
      return newResponse
    }

    const profile = await response.json()
    return NextResponse.json({
      authenticated: true,
      profile: {
        id: profile.id,
        firstName: profile.localizedFirstName,
        lastName: profile.localizedLastName,
      },
    })
  } catch (error) {
    console.error("LinkedIn status check error:", error)
    return NextResponse.json({ authenticated: false, error: "Failed to verify authentication" })
  }
}
