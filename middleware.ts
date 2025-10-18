import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getCategoryUrl,
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
} from "@/lib/utils/routing"
import { AFRICAN_EDITION } from "@/lib/editions"
import { getLegacyPostRoute } from "@/lib/legacy-routes"


// Legacy routes that should be redirected to their category equivalents
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  "/news": "news",
  "/business": "business",
  "/sport": "sport",
  "/entertainment": "entertainment",
}

function getCountryFromRequest(request: NextRequest): string {
  const rawCookieValue =
    request.cookies.get("country")?.value ??
    request.cookies.get("preferredCountry")?.value

  const normalized = rawCookieValue?.toLowerCase()

  if (!normalized) {
    return DEFAULT_COUNTRY
  }

  if (
    SUPPORTED_COUNTRIES.includes(normalized) ||
    normalized === AFRICAN_EDITION.code
  ) {
    return normalized
  }

  return DEFAULT_COUNTRY
}

async function handleLegacyPostRedirect(
  pathname: string,
  request: NextRequest,
  country: string,
): Promise<NextResponse | null> {
  // Check if it's a legacy /post/ route
  if (pathname.startsWith("/post/")) {
    const slug = pathname.replace("/post/", "")
    const legacyRoute = await getLegacyPostRoute(slug)

    if (!legacyRoute) {
      return null
    }

    if (legacyRoute.country !== country) {
      return null
    }

    const newUrl = `/${legacyRoute.country}/${legacyRoute.primaryCategory}/${legacyRoute.slug}`
    console.log(`[Middleware] Redirecting legacy post route: ${pathname} -> ${newUrl}`)
    return NextResponse.redirect(new URL(newUrl, request.url))
  }
  return null
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const { pathname } = url

  const country = getCountryFromRequest(request)

  const legacyRedirect = await handleLegacyPostRedirect(pathname, request, country)
  if (legacyRedirect) {
    return legacyRedirect
  }

  if (pathname === "/") {
    const redirectUrl = `/${country}`
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  if (LEGACY_CATEGORY_SLUGS[pathname]) {
    const redirectUrl = getCategoryUrl(LEGACY_CATEGORY_SLUGS[pathname], country)
    return NextResponse.redirect(new URL(redirectUrl, request.url))
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
  matcher: ["/", "/post/:path*", "/news", "/business", "/sport", "/entertainment", "/api/:path*"],
}
