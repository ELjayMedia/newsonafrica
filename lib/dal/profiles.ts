import "server-only"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type SupabaseServerClient = SupabaseClient<Database>
export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"]

// POSTGREST CONTRACT: profiles.getProfile
export async function getProfile(supabase: SupabaseServerClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch profile: ${error.message}`)
  }

  return data as UserProfile | null
}

// POSTGREST CONTRACT: profiles.updateProfile
export async function updateProfile(
  supabase: SupabaseServerClient,
  userId: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  revalidateTag(cacheTags.profiles(userId))

  return data as UserProfile
}

// POSTGREST CONTRACT: profiles.listProfiles (admin only)
export async function listProfiles(
  supabase: SupabaseServerClient,
  options?: { limit?: number; offset?: number },
): Promise<UserProfile[]> {
  let query = supabase.from("profiles").select("*")

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list profiles: ${error.message}`)
  }

  return (data || []) as UserProfile[]
}
