import { NextResponse, type NextRequest } from "next/server"
import { rateLimit } from "./rateLimit"
import { error as logError, info as logInfo, warn as logWarn } from "@/lib/log"
import { ENV } from "@/config/env"
import { ValidationError } from "./validation"

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  errors?: Record<string, string[]>
  meta?: Record<string, any>
}

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

function getRequestIdentifierIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  return request.headers.get("x-real-ip") ?? "127.0.0.1"
}

export async function applyRateLimit(request: NextRequest, limit: number, token: string) {
  try {
    const identifier = `${token}-${getRequestIdentifierIp(request)}`
    await limiter.check(limit, identifier)
    return null
  } catch (error) {
    logWarn("Rate limit exceeded", { error })
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      } as ApiResponse,
      { status: 429 },
    )
  }
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  logError("API Error", { error })

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errors: Object.keys(error.fieldErrors).length > 0 ? error.fieldErrors : undefined,
      } as ApiResponse,
      { status: error.statusCode },
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : error.message,
      } as ApiResponse,
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: "An unexpected error occurred",
    } as ApiResponse,
    { status: 500 },
  )
}

export function successResponse<T>(data: T, meta?: Record<string, any>): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta,
  } as ApiResponse<T>)
}

export function setCacheHeaders(res: NextResponse, maxAge = 60) {
  // Set cache control headers
  res.headers.set("Cache-Control", `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`)

  return res
}

export function logRequest(req: Request) {
  const { pathname, search } = new URL(req.url)
  logInfo(`[${req.method}] ${pathname}${search}`)
}

export function withCors<T extends Response>(req: Request, res: T): T {
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [ENV.NEXT_PUBLIC_SITE_URL, "https://news-on-africa.com"]
      : [ENV.NEXT_PUBLIC_SITE_URL || "http://app.newsonafrica.com"]

  const origin = req.headers.get("origin") || ""

  if (allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin)
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.headers.set("Access-Control-Max-Age", "86400")
  }

  return res
}

export function jsonWithCors(req: Request, data: any, init?: ResponseInit) {
  return withCors(req, NextResponse.json(data, init))
}
