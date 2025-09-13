import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/middleware"

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/category", "/search", "/auth/callback", "/auth/callback-loading"]

// Routes that should redirect to profile if already authenticated
const AUTH_ROUTES = ["/auth", "/login", "/register"]

// Legacy routes that should be redirected to their category equivalents
const LEGACY_ROUTES_MAP = {
  "/news": "/category/news",
  "/business": "/category/business",
  "/sport": "/category/sport",
  "/entertainment": "/category/entertainment",
}

// Log API requests in development
function logApiRequest(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    const { pathname, search } = request.nextUrl
    console.log(`[${request.method}] ${pathname}${search}`)
  }
}

function handleLegacyPostRedirect(pathname: string, request: NextRequest): NextResponse | null {
  // Check if it's a legacy /post/ route
  if (pathname.startsWith("/post/")) {
    const slug = pathname.replace("/post/", "")
    const defaultCountry = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"
    const newUrl = `/${defaultCountry}/article/${slug}`

    console.log(`[Middleware] Redirecting legacy post route: ${pathname} -> ${newUrl}`)
    return NextResponse.redirect(new URL(newUrl, request.url))
  }
  return null
}

export async function middleware(request: NextRequest) {
  // Log API requests
  logApiRequest(request)

  const { supabase, response } = createClient(request)

  if (!supabase) {
    console.warn("[Middleware] Supabase client not available, skipping auth checks")
    return response
  }

  const url = request.nextUrl.clone()
  const { pathname } = url

  const legacyRedirect = handleLegacyPostRedirect(pathname, request)
  if (legacyRedirect) {
    return legacyRedirect
  }

  // Handle legacy route redirects
  if (LEGACY_ROUTES_MAP[pathname]) {
    return NextResponse.redirect(new URL(LEGACY_ROUTES_MAP[pathname], request.url))
  }

  // Handle API routes separately
  if (pathname.startsWith("/api/")) {
    // Handle authentication for protected API routes
    if (
      pathname.startsWith("/api/user") ||
      pathname.startsWith("/api/subscriptions") ||
      (pathname.startsWith("/api/comments") &&
        (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE"))
    ) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }
      } catch (error) {
        console.error("[Middleware] Auth check failed:", error)
        return NextResponse.json({ success: false, error: "Authentication error" }, { status: 500 })
      }
    }

    // Add CORS headers for API routes
    const apiResponse = NextResponse.next()

    // Define allowed origins based on environment
    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [process.env.NEXT_PUBLIC_SITE_URL || "", "https://news-on-africa.com"]
        : ["http://localhost:3000"]

    const origin = request.headers.get("origin") || ""

    if (allowedOrigins.includes(origin)) {
      apiResponse.headers.set("Access-Control-Allow-Origin", origin)
      apiResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      apiResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
      apiResponse.headers.set("Access-Control-Max-Age", "86400")
    }

    return apiResponse
  }

  let session = null
  try {
    const {
      data: { session: userSession },
    } = await supabase.auth.getSession()
    session = userSession
  } catch (error) {
    console.error("[Middleware] Session check failed:", error)
    // Continue without session if there's an error
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

  return response
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
