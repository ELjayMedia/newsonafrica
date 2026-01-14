// POSTGREST CONTRACT SNAPSHOT: user_preferences (Preference Sync on Login)
// =========================================================================
// Endpoint: GET/UPSERT /rest/v1/user_preferences
// Auth: JWT (authenticated users only)
// RLS: user_id = auth.uid()
// Columns: user_id, preferred_categories, notification_settings, updated_at

import "server-only"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface UserPreferencesData {
  user_id: string
  preferred_categories: string[]
  notification_settings: Record<string, boolean>
  updated_at: string
}

export async function getUserPreferences(accessToken: string, userId: string): Promise<UserPreferencesData | null> {
  const url = `${SUPABASE_URL}/rest/v1/user_preferences?user_id=eq.${userId}&select=user_id,preferred_categories,notification_settings,updated_at`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to fetch preferences: ${response.statusText}`)
  }

  if (response.status === 404) {
    return null
  }

  const data = await response.json()
  return (data[0] as UserPreferencesData) || null
}

export async function updateUserPreferences(
  accessToken: string,
  userId: string,
  preferences: Partial<UserPreferencesData>,
): Promise<UserPreferencesData> {
  const url = `${SUPABASE_URL}/rest/v1/user_preferences?user_id=eq.${userId}&select=user_id,preferred_categories,notification_settings,updated_at`

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(preferences),
  })

  if (!response.ok) {
    throw new Error(`Failed to update preferences: ${response.statusText}`)
  }

  const data = await response.json()
  revalidateTag(cacheTags.userSettings(userId))
  return data[0] as UserPreferencesData
}
