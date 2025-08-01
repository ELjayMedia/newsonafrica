import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/"
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription)

    let errorMessage = "authentication_failed"
    switch (error) {
      case "access_denied":
        errorMessage = "access_denied"
        break
      case "server_error":
        errorMessage = "server_error"
        break
      case "temporarily_unavailable":
        errorMessage = "temporarily_unavailable"
        break
      default:
        errorMessage = "authentication_failed"
    }

    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${errorMessage}`)
  }

  if (code) {
    const supabase = createClient(cookies())

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error("Auth callback error:", exchangeError)
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=callback_error`)
      }

      if (data.session) {
        // Check if user profile exists, create if not
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single()

        if (profileError && profileError.code === "PGRST116") {
          // Profile doesn't exist, create it
          const email = data.session.user.email
          const name =
            data.session.user.user_metadata?.full_name ||
            data.session.user.user_metadata?.name ||
            email?.split("@")[0] ||
            "User"

          let username = email ? email.split("@")[0] : name.toLowerCase().replace(/\s+/g, "")

          // Check if username exists and append random number if needed
          const { data: existingUser } = await supabase
            .from("profiles")
            .select("username")
            .eq("username", username)
            .single()

          if (existingUser) {
            username = `${username}_${Math.floor(Math.random() * 10000)}`
          }

          const { error: insertError } = await supabase.from("profiles").insert({
            id: data.session.user.id,
            username,
            email: data.session.user.email,
            full_name: name,
            avatar_url: data.session.user.user_metadata?.avatar_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error("Error creating profile:", insertError)
            // Don't fail the auth process if profile creation fails
          }
        } else if (profileError) {
          console.error("Error checking profile:", profileError)
          // Don't fail the auth process if profile check fails
        }

        // Handle email confirmation
        if (data.session.user.email_confirmed_at && !data.session.user.last_sign_in_at) {
          // First time sign in after email confirmation
          return NextResponse.redirect(`${requestUrl.origin}${next}?message=email_confirmed`)
        }

        // Handle password reset
        if (requestUrl.searchParams.get("type") === "recovery") {
          return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password?code=${code}`)
        }

        // Successful login - redirect to intended page or home
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
      }
    } catch (error) {
      console.error("Session exchange error:", error)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=session_error`)
    }
  }

  // No code parameter - redirect to auth page
  return NextResponse.redirect(`${requestUrl.origin}/auth?error=no_code`)
}
