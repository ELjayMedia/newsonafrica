import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

export function middleware(request: NextRequest) {
  // Log API requests
  logApiRequest(request)

  const url = request.nextUrl.clone()
  const { pathname } = url

  const legacyRedirect = handleLegacyPostRedirect(pathname, request)
  if (legacyRedirect) {
    return legacyRedirect
  }

  if (LEGACY_ROUTES_MAP[pathname]) {
    return NextResponse.redirect(new URL(LEGACY_ROUTES_MAP[pathname], request.url))
  }

  if (pathname.startsWith("/api/")) {
    const apiResponse = NextResponse.next()

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

  return NextResponse.next()
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
