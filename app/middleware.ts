import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(request: NextRequest) {
  // If the request is for the _not-found page, redirect to the 404 page
  if (request.nextUrl.pathname === "/_not-found") {
    return NextResponse.redirect(new URL("/404", request.url))
  }

  try {
    // Check if this is a preview environment
    const isPreview =
      request.headers.get("x-vercel-protection-bypass") === "preview" ||
      request.url.includes("vusercontent.net") ||
      request.url.includes("vercel.app") ||
      process.env.NODE_ENV === "development"

    // Skip middleware in preview environments
    if (isPreview) {
      return NextResponse.next()
    }

    // Create a Supabase client configured to use cookies
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Protect routes that require authentication
    const protectedRoutes = ["/profile", "/bookmarks", "/comments", "/newsletters", "/shared", "/editions"]
    if (protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
      if (!session) {
        // Store the original URL to redirect back after login
        const redirectUrl = new URL("/auth", request.url)

        // If the request is for a specific page, store it as redirectTo
        if (request.nextUrl.pathname !== "/") {
          redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search)
        }

        return NextResponse.redirect(redirectUrl)
      }
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // In case of error, allow the request to continue to avoid blocking users
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/_not-found", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
