import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { writeSessionCookie } from "@/lib/auth/session-cookie"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/"

  if (code) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=callback_error`)
      }

      if (data.session) {
        // Check if user profile exists, create if not
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).single()

        if (!profile) {
          // Create profile for new user
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

          await supabase.from("profiles").insert({
            id: data.session.user.id,
            username,
            email: data.session.user.email,
            full_name: name,
            avatar_url: data.session.user.user_metadata?.avatar_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }

        try {
          const { data: profileSummary } = await supabase
            .from("profiles")
            .select("username, avatar_url, role, created_at, updated_at")
            .eq("id", data.session.user.id)
            .maybeSingle()

          await writeSessionCookie({
            userId: data.session.user.id,
            username: profileSummary?.username ?? null,
            avatar_url: profileSummary?.avatar_url ?? null,
            role: profileSummary?.role ?? null,
            created_at: profileSummary?.created_at ?? null,
            updated_at: profileSummary?.updated_at ?? null,
          })
        } catch (cookieError) {
          console.error("Failed to persist session cookie after callback", cookieError)
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
