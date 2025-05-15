import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createProfile } from "@/services/profile-service"

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json()

    if (!email || !password || !username) {
      return NextResponse.json({ error: "Email, password, and username are required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Create the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create the profile
    if (authData.user) {
      const profile = await createProfile(authData.user.id, {
        username,
        email,
      })

      if (!profile) {
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 400 })
      }
    }

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 400 })
  }
}
