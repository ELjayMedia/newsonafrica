import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Default session expiry is 24 hours (in seconds)
const DEFAULT_SESSION_EXPIRY = 60 * 60 * 24
// Extended session expiry is 30 days (in seconds)
const EXTENDED_SESSION_EXPIRY = 60 * 60 * 24 * 30

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        expiresIn: rememberMe ? EXTENDED_SESSION_EXPIRY : DEFAULT_SESSION_EXPIRY,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    console.error("Request parsing error in login API:", error)
    return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
  }
}
