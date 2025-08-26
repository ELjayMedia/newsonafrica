import logger from "@/utils/logger";
import { supabase } from "@/lib/supabase"
import {
  fetchById,
  fetchByIds,
  insertRecords,
  updateRecord,
  createQueryKey,
  executeWithCache,
  clearQueryCache,
} from "@/utils/supabase-query-utils"

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

// Cache TTLs
const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const USERNAME_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

/**
 * Create a new user profile
 *
 * @param userId - The user ID to create the profile for
 * @param profileData - The initial profile data
 * @returns The created profile or null if creation failed
 */
export async function createProfile(userId: string, profileData: Partial<Profile>): Promise<Profile | null> {
  try {
    const newProfile = {
      id: userId,
      username: profileData.username || userId.substring(0, 8),
      full_name: profileData.full_name || "",
      email: profileData.email || "",
      avatar_url: profileData.avatar_url || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const profiles = await insertRecords<Profile>("profiles", newProfile, {
      clearCache: /^profiles:/,
    })

    return profiles[0] || null
  } catch (error) {
    logger.error("Error in createProfile:", error)
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
    return await fetchById<Profile>("profiles", userId, {
      ttl: PROFILE_CACHE_TTL,
    })
  } catch (error) {
    logger.error("Error in fetchProfile:", error)
    return null
  }
}

/**
 * Fetch multiple user profiles by IDs
 *
 * @param userIds - Array of user IDs to fetch profiles for
 * @returns Array of user profiles
 */
export async function fetchProfiles(userIds: string[]): Promise<Profile[]> {
  try {
    if (!userIds.length) return []

    return await fetchByIds<Profile>("profiles", userIds, {
      ttl: PROFILE_CACHE_TTL,
    })
  } catch (error) {
    logger.error("Error in fetchProfiles:", error)
    return []
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
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    return await updateRecord<Profile>("profiles", userId, updatedData, {
      clearCache: new RegExp(`^profiles:.*${userId}`),
    })
  } catch (error) {
    logger.error("Error in updateProfile:", error)
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
      logger.error("Error uploading avatar:", uploadError)
      return null
    }

    const { data } = supabase.storage.from("profiles").getPublicUrl(filePath)

    // Update the user's profile with the new avatar URL
    await updateProfile(userId, {
      avatar_url: data.publicUrl,
    })

    return data.publicUrl
  } catch (error) {
    logger.error("Error in uploadAvatar:", error)
    return null
  }
}

/**
 * Check if a username exists
 *
 * @param username - The username to check
 * @returns Boolean indicating if the username exists
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    const cacheKey = createQueryKey("profiles", { username_check: username })

    const result = await executeWithCache<{ exists: boolean }>(
      supabase.from("profiles").select("username").eq("username", username).limit(1),
      cacheKey,
      USERNAME_CACHE_TTL,
    )

    return (result?.length ?? 0) > 0
  } catch (error) {
    logger.error("Error in checkUsernameExists:", error)
    throw error
  }
}

/**
 * Search for profiles by username or full name
 *
 * @param query - The search query
 * @param limit - Maximum number of results to return
 * @returns Array of matching profiles
 */
export async function searchProfiles(query: string, limit = 10): Promise<Profile[]> {
  if (!query || query.length < 2) return []

  try {
    const cacheKey = createQueryKey("profiles", { search: query, limit })

    const result = await executeWithCache<Profile>(
      supabase.from("profiles").select("*").or(`username.ilike.%${query}%,full_name.ilike.%${query}%`).limit(limit),
      cacheKey,
      60000, // 1 minute cache for searches
    )
    return result ?? []
  } catch (error) {
    logger.error("Error in searchProfiles:", error)
    return []
  }
}

/**
 * Get profiles with pagination
 *
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Paginated profiles and metadata
 */
export async function getPaginatedProfiles(
  page = 1,
  pageSize = 20,
): Promise<{
  profiles: Profile[]
  totalCount: number
  hasMore: boolean
}> {
  try {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const cacheKey = createQueryKey("profiles", { page, pageSize })

    const { data, count } = await supabase.from("profiles").select("*", { count: "exact" }).range(from, to)

    return {
      profiles: data as Profile[],
      totalCount: count || 0,
      hasMore: count ? from + pageSize < count : false,
    }
  } catch (error) {
    logger.error("Error in getPaginatedProfiles:", error)
    return {
      profiles: [],
      totalCount: 0,
      hasMore: false,
    }
  }
}

/**
 * Clear profile cache for a specific user or all profiles
 *
 * @param userId - Optional user ID to clear cache for
 */
export function clearProfileCache(userId?: string): void {
  if (userId) {
    clearQueryCache(undefined, new RegExp(`^profiles:.*${userId}`))
  } else {
    clearQueryCache(undefined, /^profiles:/)
  }
}
