import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js"

import { clearSessionCookieClient } from "@/lib/auth/session-cookie-client"
import type { Database } from "@/types/supabase"

import { getSupabaseBrowserClient } from "./client-runtime"
import type { AuthResponse, SupabaseResponse, UserProfile } from "./types"
import { USER_PROFILE_SELECT_COLUMNS } from "./types"

function handleSupabaseError(error: AuthError | Error | null): string | null {
  if (!error) return null

  if ("message" in error) {
    switch (error.message) {
      case "Invalid login credentials":
        return "Invalid email or password. Please check your credentials and try again."
      case "Email not confirmed":
        return "Please check your email and click the confirmation link before signing in."
      case "User not found":
        return "No account found with this email address."
      case "Password should be at least 6 characters":
        return "Password must be at least 6 characters long."
      case "Unable to validate email address: invalid format":
        return "Please enter a valid email address."
      case "signup_disabled":
        return "New user registration is currently disabled."
      default:
        return error.message
    }
  }

  return "An unexpected error occurred. Please try again."
}

function resolveClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
  return client ?? getSupabaseBrowserClient()
}

export interface SignInOptions {
  client?: SupabaseClient<Database>
}

export interface SignUpOptions {
  client?: SupabaseClient<Database>
}

export interface SignOutOptions {
  client?: SupabaseClient<Database>
}

export interface OAuthOptions {
  client?: SupabaseClient<Database>
}

export interface ResetPasswordOptions {
  client?: SupabaseClient<Database>
}

export async function getUserSession(
  client: SupabaseClient<Database> = getSupabaseBrowserClient(),
): Promise<AuthResponse & { profile: UserProfile | null }> {
  if (typeof window === "undefined") {
    throw new Error(
      "getUserSession is only available in client-side environments. Import getServerUserSession from '@/lib/supabase/server-component-client' instead.",
    )
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession()

    if (sessionError) {
      return {
        user: null,
        session: null,
        profile: null,
        error: handleSupabaseError(sessionError),
        success: false,
      }
    }

    const user = session?.user

    if (!user) {
      return {
        user: null,
        session: null,
        profile: null,
        error: null,
        success: true,
      }
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select(USER_PROFILE_SELECT_COLUMNS)
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error fetching user profile:", profileError)
      return {
        user,
        session,
        profile: null,
        error: null,
        success: true,
      }
    }

    return {
      user,
      session,
      profile: profile as UserProfile,
      error: null,
      success: true,
    }
  } catch (error) {
    console.error("Error getting user session:", error)
    return {
      user: null,
      session: null,
      profile: null,
      error: "Failed to retrieve user session",
      success: false,
    }
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
  options: SignInOptions = {},
): Promise<AuthResponse> {
  const client = resolveClient(options.client)

  try {
    if (!email || !password) {
      return {
        user: null,
        session: null,
        profile: null,
        error: "Email and password are required",
        success: false,
      }
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      return {
        user: null,
        session: null,
        profile: null,
        error: handleSupabaseError(error),
        success: false,
      }
    }

    return {
      user: data.user,
      session: data.session,
      profile: null,
      error: null,
      success: true,
    }
  } catch (error) {
    console.error("Error signing in:", error)
    return {
      user: null,
      session: null,
      profile: null,
      error: "Failed to sign in. Please try again.",
      success: false,
    }
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string,
  options: SignUpOptions = {},
): Promise<AuthResponse> {
  const client = resolveClient(options.client)

  try {
    if (!email || !password || !username) {
      return {
        user: null,
        session: null,
        profile: null,
        error: "Email, password, and username are required",
        success: false,
      }
    }

    const { data: existingUser } = await client
      .from("profiles")
      .select("username")
      .eq("username", username.trim())
      .single()

    if (existingUser) {
      return {
        user: null,
        session: null,
        profile: null,
        error: "Username is already taken. Please choose another.",
        success: false,
      }
    }

    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    })

    if (error) {
      return {
        user: null,
        session: null,
        profile: null,
        error: handleSupabaseError(error),
        success: false,
      }
    }

    if (data.user) {
      const { error: profileError } = await client.from("profiles").insert({
        id: data.user.id,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error("Error creating user profile:", profileError)
      }
    }

    return {
      user: data.user,
      session: data.session,
      profile: null,
      error: null,
      success: true,
    }
  } catch (error) {
    console.error("Error signing up:", error)
    return {
      user: null,
      session: null,
      profile: null,
      error: "Failed to create account. Please try again.",
      success: false,
    }
  }
}

export async function signOutUser(options: SignOutOptions = {}): Promise<SupabaseResponse<null>> {
  const client = resolveClient(options.client)

  try {
    const { error } = await client.auth.signOut()

    if (error) {
      return {
        data: null,
        error: handleSupabaseError(error),
        success: false,
      }
    }

    await clearSessionCookieClient()

    return {
      data: null,
      error: null,
      success: true,
    }
  } catch (error) {
    console.error("Error signing out:", error)
    return {
      data: null,
      error: "Failed to sign out. Please try again.",
      success: false,
    }
  }
}

export async function resetUserPassword(
  email: string,
  options: ResetPasswordOptions = {},
): Promise<SupabaseResponse<null>> {
  const client = resolveClient(options.client)

  try {
    if (!email) {
      return {
        data: null,
        error: "Email is required",
        success: false,
      }
    }

    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      return {
        data: null,
        error: handleSupabaseError(error),
        success: false,
      }
    }

    return {
      data: null,
      error: null,
      success: true,
    }
  } catch (error) {
    console.error("Error resetting password:", error)
    return {
      data: null,
      error: "Failed to send reset email. Please try again.",
      success: false,
    }
  }
}

export async function signInWithOAuth(
  provider: "google" | "facebook",
  options: OAuthOptions = {},
): Promise<SupabaseResponse<null>> {
  const client = resolveClient(options.client)

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return {
        data: null,
        error: handleSupabaseError(error),
        success: false,
      }
    }

    return {
      data: null,
      error: null,
      success: true,
    }
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error)
    return {
      data: null,
      error: `Failed to sign in with ${provider}. Please try again.`,
      success: false,
    }
  }
}

export { handleSupabaseError }
