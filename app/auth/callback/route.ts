import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { handleSocialLoginProfile } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const next = requestUrl.searchParams.get("next") || "/"

    if (code) {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        // Redirect to auth page with error
        return NextResponse.redirect(
          new URL(`/auth?error=${encodeURIComponent("Authentication failed. Please try again.")}`, request.url),
        )
      }

      // If we have a user, ensure their profile is created/updated
      if (data?.user) {
        try {
          await handleSocialLoginProfile(data.user)
        } catch (profileError) {
          console.error("Error handling social login profile:", profileError)
          // Continue anyway since the auth was successful
        }
      }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL(next, request.url))
  } catch (error) {
    console.error("Error in auth callback:", error)
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent("An unexpected error occurred. Please try again.")}`, request.url),
    )
  }
}
