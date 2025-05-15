import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { handleSocialLoginProfile } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")

    // Get the referrer URL or default to current URL without the callback path
    const origin = request.headers.get("referer") || requestUrl.origin
    const returnUrl = new URL(origin)

    // Remove the callback path if present
    if (returnUrl.pathname.includes("/auth/callback")) {
      returnUrl.pathname = "/"
    }

    if (code) {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        // Add error parameter but don't redirect
        returnUrl.searchParams.set("auth_error", encodeURIComponent("Authentication failed. Please try again."))
        return NextResponse.redirect(returnUrl)
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

    // Return to the same page without redirecting to a specific destination
    return NextResponse.redirect(returnUrl)
  } catch (error) {
    console.error("Error in auth callback:", error)
    // Return to homepage with error
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent("An unexpected error occurred. Please try again.")}`, request.url),
    )
  }
}
