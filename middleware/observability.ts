import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { logger } from "@/lib/observability/logger"
import { performanceMonitor } from "@/lib/observability/performance"

export function observabilityMiddleware(request: NextRequest) {
  const requestId = randomUUID()
  const traceId = request.headers.get("x-trace-id") || randomUUID()
  const startTime = performance.now()

  // Set request context for logging
  logger.setRequestContext(requestId, undefined, traceId)

  // Log incoming request
  logger.info("Incoming request", {
    method: request.method,
    path: request.nextUrl.pathname,
    query: Object.fromEntries(request.nextUrl.searchParams),
    userAgent: request.headers.get("user-agent") || undefined,
    ip: request.ip || request.headers.get("x-forwarded-for") || undefined,
  })

  // Continue to next middleware/handler
  const response = NextResponse.next()

  // Add observability headers
  response.headers.set("x-request-id", requestId)
  response.headers.set("x-trace-id", traceId)

  // Log response (in production, do this async to not block)
  const duration = performance.now() - startTime
  logger.info("Request completed", {
    duration,
    status: response.status,
  })

  performanceMonitor.end("request", {
    method: request.method,
    path: request.nextUrl.pathname,
    status: String(response.status),
  })

  logger.clearRequestContext()

  return response
}
