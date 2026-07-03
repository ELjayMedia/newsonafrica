/**
 * Supabase session refresh middleware (NOA-97).
 *
 * Implements the @supabase/ssr cookie-sync pattern (reference:
 * `legacy/middleware.ts`): on every matched request we create a server
 * client bound to the request cookies and call `auth.getUser()`, which
 * contacts the Supabase Auth server and rotates expired access tokens.
 * Refreshed tokens are written to both the forwarded request (so Server
 * Components in this same render see the new session) and the response
 * (so the browser stores it).
 *
 * IMPORTANT: never run code between `createServerClient` and
 * `auth.getUser()`, and always return the `response` object built here —
 * otherwise the auth cookies desynchronise and users get randomly logged
 * out.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  try {
    // getUser() (not getSession()) so the Supabase Auth server is contacted
    // and expired access tokens are refreshed — required for SSR cookie sync.
    await supabase.auth.getUser();
  } catch (error) {
    // Never fail the request because the auth backend is unreachable —
    // pages still render for anonymous visitors.
    console.warn("Supabase session refresh skipped:", error);
  }

  return response;
}

// Run on all routes except Next.js internals and static assets so Supabase
// session tokens are refreshed on every navigation.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)",
  ],
};
