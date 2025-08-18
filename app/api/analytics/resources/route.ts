import { env } from '@/lib/config/env';
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"

// Rate limiter for analytics endpoints
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 users per minute
})

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    try {
      await limiter.check(5, "RESOURCE_ANALYTICS_RATE_LIMIT") // 5 requests per minute per IP
    } catch (rateLimitError: any) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } })
    }

    // Parse the request body
    let body
    try {
      body = await request.json()
    } catch (jsonError: any) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Validate the data
    if (!body.page || !Array.isArray(body.resources)) {
      return NextResponse.json({ error: "Invalid resource data" }, { status: 400 })
    }

    // In production, you would store this data in a database
    // For now, we'll just log it in development
    if (env.NODE_ENV === "development") {
      console.log("Resource timing data:", body)
    }

    // Return success
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error processing resource analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
