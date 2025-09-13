import { createClient } from "@supabase/supabase-js"
import type { User, Session, AuthError } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import logger from '@/utils/logger'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "noa_supabase_auth",
    flowType: "pkce",
  },
})

// TypeScript types for API responses
export interface SupabaseResponse<T = any> {
  data: T | null
  error: string | null
  success: boolean
}

export interface UserProfile {
  id: string
  username: string
  full_name?: string
  bio?: string
  avatar_url?: string
  website?: string
  email?: string
  country?: string
  interests?: string[]
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: User | null
  session: Session | null
  profile?: UserProfile | null
  error: string | null
  success: boolean
}

export interface UploadResponse {
  url: string | null
  path: string | null
  error: string | null
  success: boolean
}

// Helper function to handle Supabase errors
function handleSupabaseError(error: AuthError | Error | null): string | null {
  if (!error) return null

  // Handle specific Supabase auth errors
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

/**
 * Get the current user session with profile data
 * @returns Promise with session data, user information, and profile
 */
export async function getUserSession(): Promise<AuthResponse & { profile: UserProfile | null }> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

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

    // Fetch user profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      logger.error("Error fetching user profile:", profileError)
      // Return user without profile if profile fetch fails
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
    logger.error("Error getting user session:", error)
    return {
      user: null,
      session: null,
      profile: null,
      error: "Failed to retrieve user session",
      success: false,
    }
  }
}

/**
 * Sign in user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise with authentication result
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
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

    const { data, error } = await supabase.auth.signInWithPassword({
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
    logger.error("Error signing in:", error)
    return {
      user: null,
      session: null,
      profile: null,
      error: "Failed to sign in. Please try again.",
      success: false,
    }
  }
}

/**
 * Sign up user with email, password, and username
 * @param email - User's email address
 * @param password - User's password
 * @param username - User's desired username
 * @returns Promise with authentication result
 */
export async function signUpWithEmail(email: string, password: string, username: string): Promise<AuthResponse> {
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

    // Check if username already exists
    const { data: existingUser } = await supabase
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

    const { data, error } = await supabase.auth.signUp({
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

    // Create user profile
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        logger.error("Error creating user profile:", profileError)
        // Don't fail the signup if profile creation fails
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
    logger.error("Error signing up:", error)
    return {
      user: null,
      session: null,
      profile: null,
      error: "Failed to create account. Please try again.",
      success: false,
    }
  }
}

/**
 * Sign out the current user
 * @returns Promise with sign out result
 */
export async function signOutUser(): Promise<SupabaseResponse<null>> {
  try {
    const { error } = await supabase.auth.signOut()

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
    logger.error("Error signing out:", error)
    return {
      data: null,
      error: "Failed to sign out. Please try again.",
      success: false,
    }
  }
}

/**
 * Upload user avatar to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user's ID (optional, will get from session if not provided)
 * @returns Promise with upload result and public URL
 */
export async function uploadUserAvatar(file: File, userId?: string): Promise<UploadResponse> {
  try {
    if (!file) {
      return {
        url: null,
        path: null,
        error: "No file provided",
        success: false,
      }
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return {
        url: null,
        path: null,
        error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
        success: false,
      }
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return {
        url: null,
        path: null,
        error: "File size too large. Please upload an image smaller than 5MB.",
        success: false,
      }
    }

    // Get user ID from session if not provided
    let currentUserId = userId
    if (!currentUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return {
          url: null,
          path: null,
          error: "User not authenticated",
          success: false,
        }
      }
      currentUserId = user.id
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${currentUserId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      logger.error("Upload error:", uploadError)
      return {
        url: null,
        path: null,
        error: "Failed to upload image. Please try again.",
        success: false,
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath)

    if (!urlData.publicUrl) {
      return {
        url: null,
        path: null,
        error: "Failed to get image URL",
        success: false,
      }
    }

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentUserId)

    if (updateError) {
      logger.error("Error updating profile:", updateError)
      // Don't fail the upload if profile update fails
    }

    return {
      url: urlData.publicUrl,
      path: filePath,
      error: null,
      success: true,
    }
  } catch (error) {
    logger.error("Error uploading avatar:", error)
    return {
      url: null,
      path: null,
      error: "Failed to upload avatar. Please try again.",
      success: false,
    }
  }
}

/**
 * Get user profile by ID
 * @param userId - The user's ID
 * @returns Promise with user profile data
 */
export async function getUserProfile(userId: string): Promise<SupabaseResponse<UserProfile>> {
  try {
    if (!userId) {
      return {
        data: null,
        error: "User ID is required",
        success: false,
      }
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      return {
        data: null,
        error: "Failed to fetch user profile",
        success: false,
      }
    }

    return {
      data: data as UserProfile,
      error: null,
      success: true,
    }
  } catch (error) {
    logger.error("Error getting user profile:", error)
    return {
      data: null,
      error: "Failed to fetch user profile",
      success: false,
    }
  }
}

/**
 * Update user profile
 * @param userId - The user's ID
 * @param updates - Profile fields to update
 * @returns Promise with updated profile data
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<SupabaseResponse<UserProfile>> {
  try {
    if (!userId) {
      return {
        data: null,
        error: "User ID is required",
        success: false,
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      return {
        data: null,
        error: "Failed to update profile",
        success: false,
      }
    }

    return {
      data: data as UserProfile,
      error: null,
      success: true,
    }
  } catch (error) {
    logger.error("Error updating user profile:", error)
    return {
      data: null,
      error: "Failed to update profile",
      success: false,
    }
  }
}

/**
 * Reset user password
 * @param email - User's email address
 * @returns Promise with reset result
 */
export async function resetUserPassword(email: string): Promise<SupabaseResponse<null>> {
  try {
    if (!email) {
      return {
        data: null,
        error: "Email is required",
        success: false,
      }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
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
    logger.error("Error resetting password:", error)
    return {
      data: null,
      error: "Failed to send reset email. Please try again.",
      success: false,
    }
  }
}

/**
 * Sign in with OAuth provider (Google, Facebook, etc.)
 * @param provider - OAuth provider name
 * @returns Promise with authentication result
 */
export async function signInWithOAuth(provider: "google" | "facebook"): Promise<SupabaseResponse<null>> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
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
    logger.error(`Error signing in with ${provider}:`, error)
    return {
      data: null,
      error: `Failed to sign in with ${provider}. Please try again.`,
      success: false,
    }
  }
}

// Export the Supabase client for direct use if needed
export { supabase as supabaseClient }
