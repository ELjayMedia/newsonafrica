import "server-only"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type SupabaseServerClient = SupabaseClient<Database>
export type UserPreferences = Database["public"]["Tables"]["user_preferences"]["Row"]
export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"]

// POSTGREST CONTRACT: user-preferences.getUserSettings
export async function getUserSettings(supabase: SupabaseServerClient, userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch user settings: ${error.message}`)
  }

  return data as UserSettings | null
}

// POSTGREST CONTRACT: user-preferences.updateUserSettings
export async function updateUserSettings(
  supabase: SupabaseServerClient,
  userId: string,
  updates: Partial<UserSettings>,
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update user settings: ${error.message}`)
  }

  revalidateTag(cacheTags.userSettings(userId))

  return data as UserSettings
}

// POSTGREST CONTRACT: user-preferences.getUserPreferences
export async function getUserPreferences(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<UserPreferences | null> {
  const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch user preferences: ${error.message}`)
  }

  return data as UserPreferences | null
}
