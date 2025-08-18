import logger from "@/utils/logger";
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
      await limiter.check(10, "ANALYTICS_RATE_LIMIT") // 10 requests per minute per IP
    } catch (rateLimitError: any) {
      logger.warn("Rate limit exceeded:", rateLimitError.message)
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } })
    }

    // Parse the request body
    let body
    try {
      body = await request.json()
    } catch (jsonError: any) {
      logger.error("Failed to parse JSON:", jsonError)
      return NextResponse.json({ error: "Invalid JSON payload", details: jsonError.message }, { status: 400 })
    }

    // Validate the data
    if (!body.event_name || !body.value) {
      logger.warn("Invalid metric data:", body)
      return NextResponse.json({ error: "Invalid metric data" }, { status: 400 })
    }

    // Send to Vercel Analytics
    const analyticsEndpoint = "https://vitals.vercel-analytics.com/v1/vitals"

    try {
      const analyticsResponse = await fetch(analyticsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!analyticsResponse.ok) {
        throw new Error(`Analytics API responded with ${analyticsResponse.status}`)
      }
    } catch (error: any) {
      logger.error("Failed to send to Vercel Analytics:", error)
      // Don't fail the request if analytics fails
    }

    // Return success
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error("Error processing analytics:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
