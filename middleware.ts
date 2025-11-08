import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getCategoryUrl,
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
} from "@/lib/utils/routing"
import { AFRICAN_EDITION } from "@/lib/editions"
import { getLegacyPostRoute } from "@/lib/legacy-routes"
import type { Database } from "@/types/supabase"


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

  let response: NextResponse | null = null

  const legacyRedirect = await handleLegacyPostRedirect(pathname, request, country)
  if (legacyRedirect) {
    response = legacyRedirect
  } else if (pathname === "/") {
    const redirectUrl = `/${country}`
    response = NextResponse.redirect(new URL(redirectUrl, request.url))
  } else if (LEGACY_CATEGORY_SLUGS[pathname]) {
    const redirectUrl = getCategoryUrl(LEGACY_CATEGORY_SLUGS[pathname], country)
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

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createMiddlewareClient<Database>({ req: request, res: response }, {
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      })
      await supabase.auth.getSession()
    }
  } catch (error) {
    console.warn("Supabase middleware session refresh skipped", error)
  }

  return response
}

// Only run middleware on specific paths
export const config = {
  matcher: ["/", "/post/:path*", "/news", "/business", "/sport", "/entertainment", "/api/:path*"],
}
