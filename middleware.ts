import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getCategoryUrl, DEFAULT_COUNTRY, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { AFRICAN_EDITION } from "@/lib/editions"
import type { Database } from "@/types/supabase"

// Legacy routes that should be redirected to their category equivalents
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  "/news": "news",
  "/business": "business",
  "/sport": "sport",
  "/entertainment": "entertainment",
}

const LEGACY_HOME_QUERY_FLAG = "legacyRedirect"
const LEGACY_HOME_COOKIE_FLAG = "forceLegacyHomeRedirect"
const LEGACY_HOME_HEADER_FLAG = "x-force-legacy-home-redirect"

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) return false
  return ["1", "true", "TRUE", "True"].includes(value)
}

function shouldForceLegacyHomeRedirect(request: NextRequest): boolean {
  if (isTruthyFlag(process.env.FORCE_LEGACY_HOME_REDIRECT)) {
    return true
  }

  const urlFlag = request.nextUrl.searchParams.get(LEGACY_HOME_QUERY_FLAG)
  if (isTruthyFlag(urlFlag ?? undefined)) {
    return true
  }

  const cookieFlag = request.cookies.get(LEGACY_HOME_COOKIE_FLAG)?.value
  if (isTruthyFlag(cookieFlag)) {
    return true
  }

  const headerFlag = request.headers.get(LEGACY_HOME_HEADER_FLAG) ?? undefined
  if (isTruthyFlag(headerFlag)) {
    return true
  }

  return false
}

function getCountryFromRequest(request: NextRequest): string {
  const rawCookieValue = request.cookies.get("country")?.value ?? request.cookies.get("preferredCountry")?.value

  const normalized = rawCookieValue?.toLowerCase()

  if (!normalized) {
    return DEFAULT_COUNTRY
  }

  if (SUPPORTED_COUNTRIES.includes(normalized) || normalized === AFRICAN_EDITION.code) {
    return normalized
  }

  return DEFAULT_COUNTRY
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const { pathname } = url

  const country = getCountryFromRequest(request)

  let response: NextResponse | null = null

  if (pathname === "/" && shouldForceLegacyHomeRedirect(request)) {
    const redirectUrl = `/${country}`
    response = NextResponse.redirect(new URL(redirectUrl, request.url))
  } else if (LEGACY_CATEGORY_SLUGS[pathname]) {
    const redirectUrl = getCategoryUrl(LEGACY_CATEGORY_SLUGS[pathname], country)
    response = NextResponse.redirect(new URL(redirectUrl, request.url))
  } else if (pathname.startsWith("/api/")) {
    response = NextResponse.next()

    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [process.env.NEXT_PUBLIC_SITE_URL, "https://news-on-africa.com"].filter(Boolean)
        : [process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"]

    const origin = request.headers.get("origin") ?? ""

    if (allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
      response.headers.set("Access-Control-Max-Age", "86400")
      response.headers.set("Vary", "Origin")
    }
  }

  if (!response) {
    response = NextResponse.next()
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => response!.cookies.set(name, value, options))
          },
        },
      })
      // Use getUser() (not getSession()) so the Supabase Auth server is contacted
      // and expired access tokens are refreshed — required for the SSR cookie
      // sync pattern. getSession() only decodes the cookie locally.
      await supabase.auth.getUser()
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
