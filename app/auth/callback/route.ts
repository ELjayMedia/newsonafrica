import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code)

    // Check if this is a new user from a social login
    // We'll redirect to profile completion in the client component
  }

  // URL to redirect to after sign in process completes
  // For social logins, we'll check in the client if profile completion is needed
  return NextResponse.redirect(new URL("/", request.url))
}
