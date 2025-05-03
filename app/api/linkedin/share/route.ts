import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Get the LinkedIn access token from the cookie
  const linkedInToken = request.cookies.get("linkedin_token")?.value

  if (!linkedInToken) {
    return NextResponse.json({ error: "Not authenticated with LinkedIn" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, url, summary, imageUrl } = body

    // Create the share content
    const shareContent = {
      owner: "urn:li:person:me",
      subject: title,
      text: {
        text: summary,
      },
      content: {
        contentEntities: [
          {
            entityLocation: url,
            thumbnails: imageUrl ? [{ resolvedUrl: imageUrl }] : undefined,
          },
        ],
        title,
      },
      distribution: {
        linkedInDistributionTarget: {},
      },
    }

    // Post to LinkedIn API
    const shareResponse = await fetch("https://api.linkedin.com/v2/shares", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${linkedInToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shareContent),
    })

    if (!shareResponse.ok) {
      throw new Error("Failed to share content on LinkedIn")
    }

    const shareData = await shareResponse.json()
    return NextResponse.json({ success: true, data: shareData })
  } catch (error) {
    console.error("LinkedIn sharing error:", error)
    return NextResponse.json({ error: "Failed to share content on LinkedIn" }, { status: 500 })
  }
}
