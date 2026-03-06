import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Legacy routes that should be redirected to their category equivalents
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  "/news": "news",
  "/business": "business",
  "/sport": "sport",
  "/entertainment": "entertainment",
}

const DEFAULT_COUNTRY = "sz"
const SUPPORTED_COUNTRIES = ["sz", "za", "ng"]

function getCountryFromRequest(request: NextRequest): string {
  const rawCookieValue = request.cookies.get("country")?.value ?? request.cookies.get("preferredCountry")?.value

  const normalized = rawCookieValue?.toLowerCase()

  if (!normalized) {
    return DEFAULT_COUNTRY
  }

  if (SUPPORTED_COUNTRIES.includes(normalized) || normalized === "african-edition") {
    return normalized
  }

  return DEFAULT_COUNTRY
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const country = getCountryFromRequest(request)

  let response: NextResponse | null = null

  if (LEGACY_CATEGORY_SLUGS[pathname]) {
    const categorySlug = LEGACY_CATEGORY_SLUGS[pathname]
    const redirectUrl = `/${country}/category/${categorySlug}`
    response = NextResponse.redirect(new URL(redirectUrl, request.url))
  } else if (pathname.startsWith("/api/")) {
    response = NextResponse.next()
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.set("Access-Control-Max-Age", "86400")
  }

  if (!response) {
    response = NextResponse.next()
  }

  return response
}

// Only run middleware on specific paths
export const config = {
  matcher: ["/", "/post/:path*", "/news", "/business", "/sport", "/entertainment", "/api/:path*"],
}
