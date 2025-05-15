import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

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

  // Handle authentication for protected routes
  if (
    request.nextUrl.pathname.startsWith("/api/user") ||
    request.nextUrl.pathname.startsWith("/api/bookmarks") ||
    request.nextUrl.pathname.startsWith("/api/subscriptions") ||
    (request.nextUrl.pathname.startsWith("/api/comments") &&
      (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE"))
  ) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
  }

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
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

  return NextResponse.next()
}

// Only run middleware on API routes and auth-protected pages
export const config = {
  matcher: ["/api/:path*", "/profile/:path*", "/subscriptions/:path*", "/bookmarks/:path*", "/admin/:path*"],
}
