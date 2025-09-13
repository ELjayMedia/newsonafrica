import { supabase } from "./supabase"
import type { Profile } from "./supabase"
import logger from '@/utils/logger'

// Function to get Facebook user data from the access token
export async function getFacebookUserData(accessToken: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large),first_name,last_name,link&access_token=${accessToken}`,
    )

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    logger.error("Error fetching Facebook user data:", error)
    throw error
  }
}

// Function to update user profile with Facebook data
export async function updateProfileWithFacebookData(userId: string, facebookData: any): Promise<Profile> {
  try {
    // Extract relevant data from Facebook response
    const { name, email, picture, first_name, last_name, link } = facebookData
    const avatarUrl = picture?.data?.url

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found"
      logger.error("Error fetching profile:", fetchError)
      throw fetchError
    }

    // If profile exists, update it
    if (existingProfile) {
      const updates: Partial<Profile> = {
        updated_at: new Date().toISOString(),
      }

      // Only update fields if they're not already set by the user
      if (!existingProfile.full_name && name) {
        updates.full_name = name
      }

      if (!existingProfile.avatar_url && avatarUrl) {
        updates.avatar_url = avatarUrl
      }

      // Add additional fields if available
      if (!existingProfile.website && link) {
        updates.website = link
      }

      // Store first and last name in metadata if available
      const metadata = existingProfile.metadata || {}
      if (first_name && !metadata.first_name) {
        metadata.first_name = first_name
      }
      if (last_name && !metadata.last_name) {
        metadata.last_name = last_name
      }
      updates.metadata = metadata

      // Update the profile
      const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single()

      if (error) {
        logger.error("Error updating profile with Facebook data:", error)
        throw error
      }

      return data
    }
    // If profile doesn't exist, create it
    else {
      // Generate a username from the email or name
      const username = email ? email.split("@")[0] : name?.toLowerCase().replace(/\s+/g, "") || `user_${Date.now()}`

      // Check if username exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single()

      // If username exists, append a random number
      const finalUsername = existingUser ? `${username}_${Math.floor(Math.random() * 10000)}` : username

      // Create metadata object for additional fields
      const metadata = {
        first_name: first_name || "",
        last_name: last_name || "",
        source: "facebook",
      }

      // Create the profile
      const newProfile = {
        id: userId,
        username: finalUsername,
        full_name: name,
        email,
        avatar_url: avatarUrl,
        website: link,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("profiles").insert(newProfile).select().single()

      if (error) {
        logger.error("Error creating profile with Facebook data:", error)
        throw error
      }

      return data
    }
  } catch (error) {
    logger.error("Error in updateProfileWithFacebookData:", error)
    throw error
  }
}
