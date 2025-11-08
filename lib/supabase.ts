import { type Session, type User } from "@supabase/supabase-js"
import { createClient as createBrowserClient } from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

// Create a single instance of the Supabase client to be reused
export const supabase = createBrowserClient()

type CachedProfile = { data: Profile; timestamp: number }

// Helper function to get user profile with error handling and caching
const profileCache = new Map<string, CachedProfile>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getUserProfile(userId: string): Promise<Profile> {
  const cached = profileCache.get(userId)
  const now = Date.now()

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error || !data) {
    console.error("Error fetching user profile:", error)
    throw error ?? new Error("Profile not found")
  }

  profileCache.set(userId, { data, timestamp: now })

  return data
}

// Helper function to update user profile with error handling
export async function updateUserProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single()

  if (error || !data) {
    console.error("Error updating user profile:", error)
    throw error ?? new Error("Profile update failed")
  }

  profileCache.set(userId, { data, timestamp: Date.now() })

  return data
}

// Helper function to check if a username exists
export async function checkUsernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (error) {
    console.error("Error checking username:", error)
    throw error
  }

  return Boolean(data)
}

// Helper function to check and refresh session
export async function checkAndRefreshSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error("Error getting session:", error)
    return null
  }

  const session = data.session

  if (!session || !session.expires_at) {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const timeToExpiry = session.expires_at - now

  if (timeToExpiry < 300) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError) {
      console.error("Error refreshing session:", refreshError)
      return null
    }

    return refreshData.session
  }

  return session
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
export async function handleSocialLoginProfile(user: User | null): Promise<Profile | null> {
  if (!user) {
    return null
  }

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (existingProfile && !fetchError) {
    return existingProfile
  }

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error fetching profile:", fetchError)
  }

  const email = user.email ?? undefined
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    email?.split("@")[0] ||
    "User"

  let username = email ? email.split("@")[0] : displayName.toLowerCase().replace(/\s+/g, "")

  const { data: existingUser, error: usernameError } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle()

  if (usernameError && usernameError.code !== "PGRST116") {
    console.error("Error checking existing username:", usernameError)
  }

  if (existingUser) {
    username = `${username}_${Math.floor(Math.random() * 10000)}`
  }

  const timestamp = new Date().toISOString()

  const newProfile: Profile = {
    id: user.id,
    username,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    website: null,
    bio: null,
    country: null,
    interests: null,
    location: null,
    preferences: null,
    updated_at: timestamp,
    created_at: timestamp,
    is_admin: null,
    onboarded: null,
  }

  const { data, error } = await supabase.from("profiles").insert(newProfile).select().single()

  if (error || !data) {
    console.error("Error creating profile:", error)
    throw error ?? new Error("Profile creation failed")
  }

  profileCache.set(user.id, { data, timestamp: Date.now() })

  return data
}

// Clear cache function for testing or manual cache invalidation
export function clearProfileCache(userId?: string): void {
  if (userId) {
    profileCache.delete(userId)
  } else {
    profileCache.clear()
  }
}

// Types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
