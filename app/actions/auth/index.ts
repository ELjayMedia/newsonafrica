"use server"

import type { Session, User } from "@supabase/supabase-js"

import { withSupabaseSession, type SupabaseServerClient } from "@/app/actions/supabase"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import { mapProfileRowToAuthProfile } from "@/lib/supabase/adapters/profiles"
import type { Database } from "@/types/supabase"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export interface AuthStatePayload {
  session: Session | null
  user: User | null
  profile: Profile | null
}

interface OAuthOptions {
  provider: "google" | "facebook"
  redirectTo?: string
}

const getSiteUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "")
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return "http://localhost:3000"
}

async function fetchProfile(supabase: SupabaseServerClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()

  if (error) {
    throw new ActionError("Failed to load profile", { cause: error })
  }

  return mapProfileRowToAuthProfile(data)
}

function serializeAuthState(state: AuthStatePayload): AuthStatePayload {
  return {
    session: JSON.parse(JSON.stringify(state.session)),
    user: JSON.parse(JSON.stringify(state.user)),
    profile: mapProfileRowToAuthProfile(state.profile),
  }
}

export async function getCurrentSession(): Promise<ActionResult<AuthStatePayload>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    let profile: Profile | null = null

    if (session?.user) {
      profile = await fetchProfile(supabase, session.user.id)
    }

    return serializeAuthState({
      session,
      user: session?.user ?? null,
      profile,
    })
  })
}

export async function signIn(params: { email: string; password: string }): Promise<ActionResult<AuthStatePayload>> {
  return withSupabaseSession(async ({ supabase }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    })

    if (error) {
      throw new ActionError(error.message, { cause: error })
    }

    if (!data.session || !data.user) {
      throw new ActionError("Invalid credentials")
    }

    const profile = await fetchProfile(supabase, data.user.id)

    return serializeAuthState({
      session: data.session,
      user: data.user,
      profile,
    })
  })
}

export async function signUp(params: {
  email: string
  password: string
  username: string
}): Promise<ActionResult<AuthStatePayload>> {
  return withSupabaseSession(async ({ supabase }) => {
    const normalizedUsername = params.username.trim().toLowerCase()

    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle()

    if (checkError) {
      throw new ActionError("Failed to validate username", { cause: checkError })
    }

    if (existingUser) {
      throw new ActionError("Username is already taken")
    }

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    })

    if (error) {
      throw new ActionError(error.message, { cause: error })
    }

    if (!data.user) {
      throw new ActionError("Failed to create user")
    }

    const now = new Date().toISOString()
    const newProfile = {
      id: data.user.id,
      username: normalizedUsername,
      email: params.email.toLowerCase(),
      created_at: now,
      updated_at: now,
    } satisfies Database["public"]["Tables"]["profiles"]["Insert"]

    // Supabase's type inference can resolve the insert payload to `never` when the
    // generated schema types omit relationship metadata, so we cast to `never`
    // after validating with `satisfies` above.
    const { error: profileError } = await supabase.from("profiles").insert(newProfile as never)

    if (profileError) {
      throw new ActionError("Failed to create profile", { cause: profileError })
    }

    const profile = await fetchProfile(supabase, data.user.id)

    return serializeAuthState({
      session: data.session ?? null,
      user: data.user,
      profile,
    })
  })
}

export async function signOut(): Promise<ActionResult<{ success: true }>> {
  return withSupabaseSession(async ({ supabase }) => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new ActionError(error.message, { cause: error })
    }

    return { success: true }
  })
}

export async function updateAuthCountry(countryCode: string | null): Promise<ActionResult<{ success: true }>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    const user = session?.user

    if (!user) {
      throw new ActionError("User not authenticated", { status: 401 })
    }

    const normalized = countryCode?.trim().toLowerCase() || null
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      throw new ActionError("Failed to load profile", { cause: profileError })
    }

    const existingCountry = typeof profile?.country === "string" ? profile.country.toLowerCase() : null

    if (existingCountry === normalized) {
      return { success: true }
    }

    const payload = {
      country: normalized,
      updated_at: new Date().toISOString(),
    } satisfies Partial<Database["public"]["Tables"]["profiles"]["Update"]>

    const { error } = await supabase
      .from("profiles")
      .update(payload as never)
      .eq("id", user.id)

    if (error) {
      throw new ActionError("Failed to update user country", { cause: error })
    }

    revalidateByTag(CACHE_TAGS.USERS)

    return { success: true }
  })
}

export async function refreshSession(): Promise<ActionResult<AuthStatePayload>> {
  return withSupabaseSession(async ({ supabase }) => {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      throw new ActionError("Failed to refresh session", { cause: error })
    }

    const session = data.session ?? null
    const user = session?.user ?? null
    let profile: Profile | null = null

    if (user) {
      profile = await fetchProfile(supabase, user.id)
    }

    return serializeAuthState({
      session,
      user,
      profile,
    })
  })
}

export async function resetPassword(email: string): Promise<ActionResult<{ success: true }>> {
  return withSupabaseSession(async ({ supabase }) => {
    const siteUrl = getSiteUrl()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    })

    if (error) {
      throw new ActionError("Failed to send password reset email", { cause: error })
    }

    return { success: true }
  })
}

export async function signInWithOAuth({
  provider,
  redirectTo,
}: OAuthOptions): Promise<ActionResult<{ url: string | null }>> {
  return withSupabaseSession(async ({ supabase }) => {
    const siteUrl = getSiteUrl()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || `${siteUrl}/auth/callback`,
      },
    })

    if (error) {
      throw new ActionError(`Failed to sign in with ${provider}`, { cause: error })
    }

    return { url: data?.url ?? null }
  })
}

export async function getProfile(): Promise<ActionResult<Profile | null>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    if (!session?.user) {
      return null
    }

    const profile = await fetchProfile(supabase, session.user.id)
    return mapProfileRowToAuthProfile(profile)
  })
}

export async function updateProfile(
  updates: Partial<Database["public"]["Tables"]["profiles"]["Update"]>,
): Promise<ActionResult<Profile>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    if (!session?.user) {
      throw new ActionError("User not authenticated")
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    } satisfies Database["public"]["Tables"]["profiles"]["Update"]

    const { data, error } = await supabase
      .from("profiles")
      .update(payload as never)
      .eq("id", session.user.id)
      .select()
      .single()

    if (error || !data) {
      throw new ActionError("Failed to update profile", { cause: error })
    }

    revalidateByTag(CACHE_TAGS.USERS)

    return mapProfileRowToAuthProfile(data) as Profile
  })
}
