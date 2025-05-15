/**
 * Profile Service
 *
 * Handles all profile-related API calls and operations
 */

import { supabase } from "@/lib/supabase"

/**
 * Profile interface
 */
export interface Profile {
  id: string
  username: string
  full_name?: string
  bio?: string
  avatar_url?: string
  website?: string
  email?: string
  country?: string
  interests?: string[]
  updated_at?: string
  created_at?: string
}

/**
 * Create a new user profile
 *
 * @param userId - The user ID to create the profile for
 * @param profileData - The initial profile data
 * @returns The created profile or null if creation failed
 */
export async function createProfile(userId: string, profileData: Partial<Profile>): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        username: profileData.username || userId.substring(0, 8),
        full_name: profileData.full_name || "",
        email: profileData.email || "",
        avatar_url: profileData.avatar_url || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in createProfile:", error)
    return null
  }
}

/**
 * Fetch a user profile by ID
 *
 * @param userId - The user ID to fetch the profile for
 * @returns The user profile or null if not found
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error fetching profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in fetchProfile:", error)
    return null
  }
}

/**
 * Update a user profile
 *
 * @param userId - The user ID to update the profile for
 * @param updates - The profile fields to update
 * @returns The updated profile or null if update failed
 */
export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  try {
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
      console.error("Error updating profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in updateProfile:", error)
    return null
  }
}

/**
 * Upload a profile avatar
 *
 * @param userId - The user ID to upload the avatar for
 * @param file - The file to upload
 * @returns The URL of the uploaded avatar or null if upload failed
 */
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split(".").pop()
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file)

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError)
      return null
    }

    const { data } = supabase.storage.from("profiles").getPublicUrl(filePath)

    // Update the user's profile with the new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: data.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating profile with avatar:", updateError)
    }

    return data.publicUrl
  } catch (error) {
    console.error("Error in uploadAvatar:", error)
    return null
  }
}
