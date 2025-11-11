import type { AuthError, Session, SupabaseClient, User } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"
import { createClient as createBrowserClient } from "./browser-client"
import type { SessionCookieProfile } from "@/lib/auth/session-cookie"
import { clearSessionCookieClient, persistSessionCookie } from "@/lib/auth/session-cookie-client"

export const USER_PROFILE_SELECT_COLUMNS = "id, username, avatar_url, role, handle"

export interface SupabaseResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
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

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type UserProfile = Profile

type CachedProfile = { data: UserProfile; timestamp: number }

const profileCache = new Map<string, CachedProfile>()
const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let browserClient: SupabaseClient<Database> | null = null

const SUPABASE_CONFIG_ERROR =
  "Supabase configuration is missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient()
}

function ensureSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_CONFIG_ERROR)
    }

    browserClient = createClient()
  }

  return browserClient
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  return ensureSupabaseClient()
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = ensureSupabaseClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
  set(_target, prop, value) {
    const client = ensureSupabaseClient()
    Reflect.set(client as object, prop, value)
    return true
  },
  has(_target, prop) {
    const client = ensureSupabaseClient()
    return Reflect.has(client as object, prop)
  },
}) as SupabaseClient<Database>

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

function createSessionCookiePayload(
  userId: string,
  profile: Partial<UserProfile> | null,
): SessionCookieProfile {
  return {
    userId,
    username: profile?.username ?? null,
    avatar_url: profile?.avatar_url ?? null,
    role: profile?.role ?? null,
    created_at: profile?.created_at ?? null,
    updated_at: profile?.updated_at ?? null,
  }
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

export interface SignInOptions {
  client?: SupabaseClient<Database>
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

export interface SignUpOptions {
  client?: SupabaseClient<Database>
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

export interface SignOutOptions {
  client?: SupabaseClient<Database>
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

export interface UploadAvatarOptions {
  client?: SupabaseClient<Database>
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

    const maxSize = 5 * 1024 * 1024 // 5MB
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

export interface ResetPasswordOptions {
  client?: SupabaseClient<Database>
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

export interface OAuthOptions {
  client?: SupabaseClient<Database>
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

export interface GetProfileOptions {
  client?: SupabaseClient<Database>
  skipCache?: boolean
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

export interface UpdateProfileOptions {
  client?: SupabaseClient<Database>
  persistCookie?: boolean
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
    await persistSessionCookie(createSessionCookiePayload(userId, profile))
  }

  return profile
}

export interface CheckUsernameOptions {
  client?: SupabaseClient<Database>
}

export async function checkUsernameExists(
  username: string,
  options: CheckUsernameOptions = {},
): Promise<boolean> {
  const client = resolveClient(options.client)
  const { data, error } = await client
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

export interface SessionOptions {
  client?: SupabaseClient<Database>
}

export async function checkAndRefreshSession(
  options: SessionOptions = {},
): Promise<Session | null> {
  const client = resolveClient(options.client)
  const { data, error } = await client.auth.getSession()

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
    const { data: refreshData, error: refreshError } = await client.auth.refreshSession()

    if (refreshError) {
      console.error("Error refreshing session:", refreshError)
      return null
    }

    return refreshData.session
  }

  return session
}

export function getSessionExpiryTime(session: Session | null): string {
  if (!session || !session.expires_at) {
    return "Unknown"
  }

  const expiryDate = new Date(session.expires_at * 1000)
  return expiryDate.toLocaleString()
}

export interface SocialLoginOptions {
  client?: SupabaseClient<Database>
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

export function clearProfileCache(userId?: string): void {
  if (userId) {
    profileCache.delete(userId)
  } else {
    profileCache.clear()
  }
}

