import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { Session } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables. Please check your .env file.")
}

// Create a single instance of the Supabase client to be reused
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "noa_supabase_auth",
    flowType: "pkce", // Better security for OAuth
    debug: process.env.NODE_ENV === "development", // Enable debug logs in development
    // Define OAuth providers we're using
    providers: ["facebook", "google"],
  },
})

// Helper function to get user profile with error handling
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error fetching user profile:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in getUserProfile:", error)
    throw error
  }
}

// Helper function to update user profile with error handling
export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  try {
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single()

    if (error) {
      console.error("Error updating user profile:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in updateUserProfile:", error)
    throw error
  }
}

// Helper function to check if a username exists
export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("profiles").select("username").eq("username", username).maybeSingle()

    if (error) {
      console.error("Error checking username:", error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error("Error in checkUsernameExists:", error)
    throw error
  }
}

// Helper function to check and refresh session
export async function checkAndRefreshSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Error getting session:", error)
      return null
    }

    if (!data.session) {
      return null
    }

    // If session exists but is close to expiry, refresh it
    const expiresAt = data.session.expires_at
    const now = Math.floor(Date.now() / 1000)
    const timeToExpiry = expiresAt - now

    // If session expires in less than 5 minutes, refresh it
    if (timeToExpiry < 300) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.error("Error refreshing session:", refreshError)
        return null
      }

      return refreshData.session
    }

    return data.session
  } catch (error) {
    console.error("Error in checkAndRefreshSession:", error)
    return null
  }
}

// Helper function to get session expiry time
export function getSessionExpiryTime(session: Session | null): string {
  if (!session || !session.expires_at) {
    return "Unknown"
  }

  const expiryDate = new Date(session.expires_at * 1000)
  return expiryDate.toLocaleString()
}

// Function to handle social login profile creation/update
export async function handleSocialLoginProfile(user: any) {
  if (!user) return null

  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    // If profile exists, return it
    if (existingProfile && !fetchError) {
      return existingProfile
    }

    // If error is not "not found", log it
    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching profile:", fetchError)
    }

    // Create a new profile
    const email = user.email
    const name = user.user_metadata?.full_name || user.user_metadata?.name || email?.split("@")[0] || "User"

    // Generate username from email or name
    let username = email ? email.split("@")[0] : name.toLowerCase().replace(/\s+/g, "")

    // Check if username exists and append random number if needed
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single()
      .catch(() => ({ data: null }))

    if (existingUser) {
      username = `${username}_${Math.floor(Math.random() * 10000)}`
    }

    // Create profile
    const newProfile = {
      id: user.id,
      username,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("profiles").insert(newProfile).select().single()

    if (error) {
      console.error("Error creating profile:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error handling social login profile:", error)
    throw error
  }
}

// Types
export type Profile = {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
  website?: string
  email?: string
  bio?: string
  updated_at?: string
  created_at?: string
}
