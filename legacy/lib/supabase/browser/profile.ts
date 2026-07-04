import type { SupabaseClient, User } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

import { getSupabaseBrowserClient } from "./client-runtime"
import { persistSessionCookieForProfile } from "./session"
import type { UploadResponse, UserProfile } from "./types"

type CachedProfile = { data: UserProfile; timestamp: number }

const profileCache = new Map<string, CachedProfile>()
const PROFILE_CACHE_TTL = 5 * 60 * 1000

function resolveClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
  return client ?? getSupabaseBrowserClient()
}

export interface GetProfileOptions {
  client?: SupabaseClient<Database>
  skipCache?: boolean
}

export interface UpdateProfileOptions {
  client?: SupabaseClient<Database>
  persistCookie?: boolean
}

export interface CheckUsernameOptions {
  client?: SupabaseClient<Database>
}

export interface SocialLoginOptions {
  client?: SupabaseClient<Database>
}

export interface UploadAvatarOptions {
  client?: SupabaseClient<Database>
}

export async function getUserProfile(
  userId: string,
  options: GetProfileOptions = {},
): Promise<UserProfile> {
  const client = resolveClient(options.client)
  const useCache = options.skipCache !== true
  const now = Date.now()

  if (useCache) {
    const cached = profileCache.get(userId)
    if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
      return cached.data
    }
  }

  const { data, error } = await client.from("profiles").select("*").eq("id", userId).single()

  if (error || !data) {
    console.error("Error fetching user profile:", error)
    throw error ?? new Error("Profile not found")
  }

  const profile = data as UserProfile

  if (useCache) {
    profileCache.set(userId, { data: profile, timestamp: now })
  }

  return profile
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
  options: UpdateProfileOptions = {},
): Promise<UserProfile> {
  const client = resolveClient(options.client)

  const { data, error } = await client
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single()

  if (error || !data) {
    console.error("Error updating user profile:", error)
    throw error ?? new Error("Profile update failed")
  }

  const profile = data as UserProfile

  profileCache.set(userId, { data: profile, timestamp: Date.now() })

  if (options.persistCookie ?? true) {
    await persistSessionCookieForProfile(userId, profile)
  }

  return profile
}

export async function checkUsernameExists(
  username: string,
  options: CheckUsernameOptions = {},
): Promise<boolean> {
  const client = resolveClient(options.client)
  const { data, error } = await client.from("profiles").select("id").eq("username", username).maybeSingle()

  if (error) {
    console.error("Error checking username:", error)
    throw error
  }

  return Boolean(data)
}

export async function handleSocialLoginProfile(
  user: User | null,
  options: SocialLoginOptions = {},
): Promise<UserProfile | null> {
  if (!user) {
    return null
  }

  const client = resolveClient(options.client)

  const { data: existingProfile, error: fetchError } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (existingProfile && !fetchError) {
    return existingProfile as UserProfile
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

  const { data: existingUser, error: usernameError } = await client
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

  const newProfile: UserProfile = {
    id: user.id,
    username,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    website: null,
    bio: null,
    country: null,
    location: null,
    interests: null,
    preferences: null,
    updated_at: timestamp,
    created_at: timestamp,
    is_admin: null,
    onboarded: null,
    role: null,
    handle: null,
  }

  const { data, error } = await client.from("profiles").insert(newProfile).select().single()

  if (error || !data) {
    console.error("Error creating profile:", error)
    throw error ?? new Error("Profile creation failed")
  }

  const profile = data as UserProfile

  profileCache.set(user.id, { data: profile, timestamp: Date.now() })

  return profile
}

export async function uploadUserAvatar(
  file: File,
  userId?: string,
  options: UploadAvatarOptions = {},
): Promise<UploadResponse> {
  const client = resolveClient(options.client)

  try {
    if (!file) {
      return {
        url: null,
        path: null,
        error: "No file provided",
        success: false,
      }
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return {
        url: null,
        path: null,
        error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
        success: false,
      }
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        url: null,
        path: null,
        error: "File size too large. Please upload an image smaller than 5MB.",
        success: false,
      }
    }

    let currentUserId = userId
    if (!currentUserId) {
      const {
        data: { user },
      } = await client.auth.getUser()
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

    const fileExt = file.name.split(".").pop()
    const fileName = `${currentUserId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await client.storage.from("profiles").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return {
        url: null,
        path: null,
        error: "Failed to upload image. Please try again.",
        success: false,
      }
    }

    const { data: urlData } = client.storage.from("profiles").getPublicUrl(filePath)

    if (!urlData.publicUrl) {
      return {
        url: null,
        path: null,
        error: "Failed to get image URL",
        success: false,
      }
    }

    const { error: updateError } = await client
      .from("profiles")
      .update({
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentUserId)

    if (updateError) {
      console.error("Error updating profile:", updateError)
    }

    return {
      url: urlData.publicUrl,
      path: filePath,
      error: null,
      success: true,
    }
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return {
      url: null,
      path: null,
      error: "Failed to upload avatar. Please try again.",
      success: false,
    }
  }
}

export function clearProfileCache(userId?: string): void {
  if (userId) {
    profileCache.delete(userId)
  } else {
    profileCache.clear()
  }
}
