import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function resetPassword(email: string) {
  const cookieStore = cookies()
  const supabase = createClient({ cookies: () => cookieStore })

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.SITE_URL}/reset-password`,
    })

    if (error) {
      console.error("Error resetting password:", error)
      throw new Error("Failed to send reset password email")
    }

    return { success: true, message: "Reset password email sent successfully" }
  } catch (error) {
    console.error("Error in resetPassword function:", error)
    throw new Error("Failed to send reset password email")
  }
}

export async function signUp(username: string, email: string, password: string) {
  const cookieStore = cookies()
  const supabase = createClient({ cookies: () => cookieStore })

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })

    if (error) {
      console.error("Error signing up:", error)
      throw new Error("Failed to create user")
    }

    return data.user
  } catch (error) {
    console.error("Error in signUp function:", error)
    throw new Error("Failed to create user")
  }
}

export async function signIn(email: string, password: string) {
  const cookieStore = cookies()
  const supabase = createClient({ cookies: () => cookieStore })

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Error signing in:", error)
      throw new Error("Authentication failed")
    }

    return data.session?.access_token
  } catch (error) {
    console.error("Error in signIn function:", error)
    throw new Error("Authentication failed")
  }
}
