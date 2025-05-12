import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const token = request.cookies.get("linkedin_token")?.value

  if (!token) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, url, summary, imageUrl } = body

    // Get user profile to get URN
    const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!profileResponse.ok) {
      return NextResponse.json({ success: false, error: "Failed to get profile" }, { status: 401 })
    }

    const profile = await profileResponse.json()
    const userUrn = profile.id

    // Create share
    const shareData = {
      owner: `urn:li:person:${userUrn}`,
      subject: title,
      text: {
        text: summary || title,
      },
      content: {
        contentEntities: [
          {
            entityLocation: url,
            thumbnails: imageUrl ? [{ resolvedUrl: imageUrl }] : undefined,
          },
        ],
        title: title,
      },
      distribution: {
        linkedInDistributionTarget: {},
      },
    }

    const shareResponse = await fetch("https://api.linkedin.com/v2/shares", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shareData),
    })

    if (!shareResponse.ok) {
      const errorData = await shareResponse.json()
      console.error("LinkedIn share error:", errorData)
      return NextResponse.json({ success: false, error: "Failed to share" }, { status: 500 })
    }

    const shareResult = await shareResponse.json()
    return NextResponse.json({ success: true, data: shareResult })
  } catch (error) {
    console.error("LinkedIn share error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
