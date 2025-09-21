import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getServerCountry, getCategoryUrl, DEFAULT_COUNTRY } from "@/lib/utils/routing"


// Legacy routes that should be redirected to their category equivalents
const LEGACY_ROUTES_MAP: Record<string, string> = {
  "/news": getCategoryUrl("news", DEFAULT_COUNTRY),
  "/business": getCategoryUrl("business", DEFAULT_COUNTRY),
  "/sport": getCategoryUrl("sport", DEFAULT_COUNTRY),
  "/entertainment": getCategoryUrl("entertainment", DEFAULT_COUNTRY),
}

function handleLegacyPostRedirect(pathname: string, request: NextRequest): NextResponse | null {
  // Check if it's a legacy /post/ route
  if (pathname.startsWith("/post/")) {
    const slug = pathname.replace("/post/", "")
    const newUrl = `/${getServerCountry()}/article/${slug}`
    console.log(`[Middleware] Redirecting legacy post route: ${pathname} -> ${newUrl}`)
    return NextResponse.redirect(new URL(newUrl, request.url))
  }
  return null
}

export function middleware(request: NextRequest) {
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
    apiResponse.headers.set("Access-Control-Allow-Origin", "*")
    apiResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    apiResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    apiResponse.headers.set("Access-Control-Max-Age", "86400")
    return apiResponse
  }

  return NextResponse.next()
}

// Only run middleware on specific paths
export const config = {
  matcher: ["/post/:path*", "/news", "/business", "/sport", "/entertainment", "/api/:path*"],
}
