import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

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
    flowType: "pkce", // Add this line for better OAuth security
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
