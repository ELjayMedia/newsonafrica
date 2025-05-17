import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accessToken, content, url } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Make the LinkedIn API request
    const shareResponse = await fetch("https://api.linkedin.com/v2/shares", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: "urn:li:person:me",
        text: { text: content },
        content: url
          ? {
              contentEntities: [
                {
                  entityLocation: url,
                },
              ],
            }
          : undefined,
        distribution: {
          linkedInDistributionTarget: {},
        },
      }),
    })

    if (!shareResponse.ok) {
      const errorData = await shareResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: "Failed to share on LinkedIn", details: errorData },
        { status: shareResponse.status },
      )
    }

    const shareData = await shareResponse.json()
    return NextResponse.json({ success: true, data: shareData })
  } catch (error) {
    console.error("LinkedIn share error:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
