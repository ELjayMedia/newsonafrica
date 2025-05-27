import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest): Promise<NextResponse> {
  const json = await request.json()
  const topic = request.headers.get("x-wp-webhook-topic")

  if (!topic) {
    return new NextResponse("Missing topic", { status: 400 })
  }

  try {
    switch (topic) {
      case "core.post.updated":
      case "core.post.created":
      case "core.post.deleted":
        // Assuming the JSON payload contains a 'permalink' field
        if (json?.permalink) {
          const path = new URL(json.permalink).pathname
          revalidatePath(path)
          console.log(`Revalidated path: ${path}`)
        } else {
          console.warn("Permalink not found in payload, cannot revalidate.")
        }
        revalidatePath("/") // Revalidate the homepage as well
        break
      default:
        console.log(`Unhandled topic: ${topic}`)
        break
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error("Error processing webhook:", error)
    return new NextResponse(`Webhook processing failed: ${error.message}`, {
      status: 500,
    })
  }
}
