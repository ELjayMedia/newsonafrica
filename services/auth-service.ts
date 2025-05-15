/**
 * Authentication Service
 *
 * Handles all authentication-related API calls and operations
 */

import { supabase } from "@/lib/supabase"
import type { Provider, User, Session } from "@supabase/supabase-js"

// Session durations in seconds
export const SESSION_DURATIONS = {
  DEFAULT: 60 * 60, // 1 hour
  EXTENDED: 60 * 60 * 24 * 30, // 30 days
}

/**
 * Sign in with email and password
 *
 * @param email - User's email address
 * @param password - User's password
 * @param rememberMe - Whether to extend the session duration
 * @returns Authentication data including user and session
 */
export async function signInWithEmail(email: string, password: string, rememberMe = false) {
  try {
    // Set session expiry based on "Remember me" option
    const expiresIn = rememberMe ? SESSION_DURATIONS.EXTENDED : SESSION_DURATIONS.DEFAULT

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        expiresIn, // Set session duration
      },
    })

    if (error) throw error

    // Store the "remember me" preference in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("noa_remember_me", rememberMe ? "true" : "false")
    }

    return data
  } catch (error) {
    console.error("Error signing in:", error)
    throw error
  }
}

/**
 * Sign up with email, password and username
 *
 * @param email - User's email address
 * @param password - User's password
 * @param username - User's desired username
 * @returns Authentication data including user and session
 */
export async function signUpWithEmail(email: string, password: string, username: string) {
  try {
    // Check if username already exists before attempting signup
    const { data: existingUsers, error: checkError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing username:", checkError)
    }

    if (existingUsers) {
      throw new Error("Username already exists. Please choose another username.")
    }

    // First, create the user with Supabase Auth
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
      console.error("Supabase auth signup error:", error)
      throw error
    }

    if (!data.user) {
      throw new Error("User creation failed")
    }

    // Wait a moment to allow any database triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check if profile was created by trigger
    const { data: profile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    // If profile doesn't exist yet, create it manually
    if (profileCheckError || !profile) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        // Don't throw here, as the user was created successfully
      }
    }

    return data
  } catch (error) {
    console.error("Error signing up:", error)
    throw error
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Clear remember me preference
    if (typeof window !== "undefined") {
      localStorage.removeItem("noa_remember_me")
    }

    return { success: true }
  } catch (error) {
    console.error("Error signing out:", error)
    throw error
  }
}

/**
 * Reset password for a user
 *
 * @param email - User's email address
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error resetting password:", error)
    throw error
  }
}

/**
 * Sign in with a social provider
 *
 * @param provider - The social provider to use (e.g., 'google', 'facebook')
 * @returns Authentication data
 */
export async function signInWithSocialProvider(provider: Provider) {
  try {
    // Check if "remember me" was previously selected
    const rememberMe = typeof window !== "undefined" && localStorage.getItem("noa_remember_me") === "true"

    // Store the "remember me" preference for future social logins
    if (typeof window !== "undefined" && !localStorage.getItem("noa_remember_me")) {
      localStorage.setItem("noa_remember_me", "false") // Default to false if not set
    }

    // Configure provider-specific options
    const options: Record<string, any> = {
      redirectTo: `${window.location.origin}/auth/callback`,
    }

    // Add provider-specific scopes
    if (provider === "google" && rememberMe) {
      options.scopes = "offline_access"
    } else if (provider === "facebook") {
      options.scopes = rememberMe ? "email,public_profile,user_friends" : "email,public_profile"
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error)
    throw error
  }
}

/**
 * Refresh the current session
 *
 * @returns The refreshed session data and success status
 */
export async function refreshSession(): Promise<{ success: boolean; session: Session | null; user: User | null }> {
  try {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error("Session refresh error:", error)
      return { success: false, session: null, user: null }
    }

    return {
      success: true,
      session: data.session,
      user: data.session?.user ?? null,
    }
  } catch (error) {
    console.error("Error refreshing session:", error)
    return { success: false, session: null, user: null }
  }
}

/**
 * Get the current session
 *
 * @returns The current session data
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Error getting session:", error)
      return { session: null, user: null }
    }

    return {
      session: data.session,
      user: data.session?.user ?? null,
    }
  } catch (error) {
    console.error("Error getting current session:", error)
    return { session: null, user: null }
  }
}
