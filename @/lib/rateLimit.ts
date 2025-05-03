import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const RATE_LIMIT = 100 // Number of requests
const rateLimitPeriod = 15 * 60 * 1000 // 15 minutes in milliseconds

const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimitMiddleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1"
  const now = Date.now()
  const requestData = ipRequestCounts.get(ip) ?? { count: 0, resetTime: now + rateLimitPeriod }

  if (now > requestData.resetTime) {
    requestData.count = 1
    requestData.resetTime = now + rateLimitPeriod
  } else {
    requestData.count++
  }

  ipRequestCounts.set(ip, requestData)

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
