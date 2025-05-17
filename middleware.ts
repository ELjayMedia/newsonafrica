import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/news", "/business", "/sport", "/entertainment", "/search", "/post"]

// Routes that should redirect to profile if already authenticated
const AUTH_ROUTES = ["/auth", "/login", "/register"]

// Log API requests in development
function logApiRequest(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    const { pathname, search } = request.nextUrl
    console.log(`[${request.method}] ${pathname}${search}`)
  }
}

export async function middleware(request: NextRequest) {
  // Log API requests
  logApiRequest(request)

  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req: request, res })

  // Check if the user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const url = request.nextUrl.clone()
  const { pathname } = url

  // Handle API routes separately
  if (pathname.startsWith("/api/")) {
    // Handle authentication for protected API routes
    if (
      pathname.startsWith("/api/user") ||
      pathname.startsWith("/api/bookmarks") ||
      pathname.startsWith("/api/subscriptions") ||
      (pathname.startsWith("/api/comments") &&
        (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE"))
    ) {
      if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }
    }

    // Add CORS headers for API routes
    const response = NextResponse.next()

    // Define allowed origins based on environment
    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [process.env.NEXT_PUBLIC_SITE_URL || "", "https://news-on-africa.com"]
        : ["http://localhost:3000"]

    const origin = request.headers.get("origin") || ""

    if (allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
      response.headers.set("Access-Control-Max-Age", "86400")
    }

    return response
  }

  // If user is on an auth page but already logged in, redirect to profile
  if (session && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    // Check if there's a returnTo parameter
    const returnTo = url.searchParams.get("returnTo")
    if (returnTo) {
      return NextResponse.redirect(new URL(decodeURIComponent(returnTo), request.url))
    }
    return NextResponse.redirect(new URL("/profile", request.url))
  }

  // If user is trying to access a protected route but not logged in
  if (
    !session &&
    !PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) &&
    !pathname.startsWith("/auth") &&
    !pathname.includes(".")
  ) {
    // Store the current URL to redirect back after login
    const returnTo = encodeURIComponent(pathname + url.search)
    return NextResponse.redirect(new URL(`/auth?returnTo=${returnTo}`, request.url))
  }

  return res
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
