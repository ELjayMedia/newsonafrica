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
      console.warn("Rate limit exceeded:", rateLimitError.message)
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } })
    }

    // Parse the request body
    let body
    try {
      body = await request.json()
    } catch (jsonError: any) {
      console.error("Failed to parse JSON:", jsonError)
      return NextResponse.json({ error: "Invalid JSON payload", details: jsonError.message }, { status: 400 })
    }

    // Validate the data
    if (!body.name || typeof body.value !== "number") {
      console.warn("Invalid metric data:", body)
      return NextResponse.json({ error: "Invalid metric data" }, { status: 400 })
    }

    // In a real implementation, you would store this data in a database
    // For now, we'll just log it in development
    if (process.env.NODE_ENV === "development") {
      console.log("Received web vital:", body)
    }

    // Simulate storing data (replace with actual database logic)
    try {
      // Simulate a database operation that might fail
      // await new Promise((_, reject) => setTimeout(() => reject(new Error("Simulated database error")), 500));

      // If the above line is commented out, this will always succeed
      console.log("Successfully processed web vital:", body)
    } catch (dbError: any) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to store metric data", details: dbError.message }, { status: 500 })
    }

    // Return success
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error processing analytics:", error)

    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
