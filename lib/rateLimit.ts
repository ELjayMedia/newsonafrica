import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Number of requests allowed per window
export const RATE_LIMIT = 100
// 15 minutes in milliseconds
export const RATE_LIMIT_PERIOD = 15 * 60 * 1000
// Interval for cleaning up stale entries
export const CLEANUP_INTERVAL = 60 * 1000
// Maximum number of IP entries stored at any time
export const MAX_IP_ENTRIES = 1000

// Map storing request counts and reset times by IP
export const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()

// Periodically remove expired entries and trim the map size
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of ipRequestCounts) {
    if (now > data.resetTime) {
      ipRequestCounts.delete(ip)
    }
  }

  // Ensure the map does not grow beyond the maximum size
  if (ipRequestCounts.size > MAX_IP_ENTRIES) {
    const keys = ipRequestCounts.keys()
    while (ipRequestCounts.size > MAX_IP_ENTRIES) {
      const oldest = keys.next().value
      if (!oldest) break
      ipRequestCounts.delete(oldest)
    }
  }
}, CLEANUP_INTERVAL)

// Don't keep the event loop alive solely for the cleanup timer
if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref()
}

export function rateLimitMiddleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1"
  const now = Date.now()
  const requestData = ipRequestCounts.get(ip) ?? { count: 0, resetTime: now + RATE_LIMIT_PERIOD }

  if (now > requestData.resetTime) {
    requestData.count = 1
    requestData.resetTime = now + RATE_LIMIT_PERIOD
  } else {
    requestData.count++
  }

  ipRequestCounts.set(ip, requestData)

  // Trim oldest entries if size exceeds the limit
  if (ipRequestCounts.size > MAX_IP_ENTRIES) {
    const oldestKey = ipRequestCounts.keys().next().value
    if (oldestKey) {
      ipRequestCounts.delete(oldestKey)
    }
  }

  const remainingRequests = Math.max(RATE_LIMIT - requestData.count, 0)
  const response = NextResponse.next()

  response.headers.set("X-RateLimit-Limit", RATE_LIMIT.toString())
  response.headers.set("X-RateLimit-Remaining", remainingRequests.toString())
  response.headers.set("X-RateLimit-Reset", requestData.resetTime.toString())

  if (requestData.count > RATE_LIMIT) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  return response
}

export const rateLimit = rateLimitMiddleware
