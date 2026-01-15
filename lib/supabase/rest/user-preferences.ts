import { buildRestUrl } from "./client"
import { parseResponse } from "./errors"
import { authHeaders, jsonHeaders, preferHeaders } from "./headers"

export interface UserPreferencesData {
  user_id: string
  preferred_categories: string[]
  notification_settings: Record<string, boolean>
  updated_at: string
}

export interface UserSettingsData {
  user_id: string
  settings: Record<string, unknown>
  updated_at: string | null
}

export async function getUserPreferences(params: {
  accessToken: string
  userId: string
  fetchOptions?: RequestInit
}): Promise<UserPreferencesData | null> {
  const url = buildRestUrl(
    "user_preferences",
    new URLSearchParams({
      user_id: `eq.${params.userId}`,
      select: "user_id,preferred_categories,notification_settings,updated_at",
    }),
  )

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<UserPreferencesData[]>(response)
  return data[0] ?? null
}

export async function updateUserPreferences(params: {
  accessToken: string
  userId: string
  preferences: Partial<UserPreferencesData>
  fetchOptions?: RequestInit
}): Promise<UserPreferencesData> {
  const url = buildRestUrl(
    "user_preferences",
    new URLSearchParams({
      user_id: `eq.${params.userId}`,
      select: "user_id,preferred_categories,notification_settings,updated_at",
    }),
  )

  const response = await fetch(url, {
    method: "PATCH",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify(params.preferences),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<UserPreferencesData[]>(response)
  return data[0]
}

export async function getUserSettings(params: {
  accessToken: string
  userId: string
  fetchOptions?: RequestInit
}): Promise<UserSettingsData | null> {
  const url = buildRestUrl(
    "user_settings",
    new URLSearchParams({
      user_id: `eq.${params.userId}`,
      select: "user_id,settings,updated_at",
    }),
  )

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<UserSettingsData[]>(response)
  return data[0] ?? null
}

export async function updateUserSettings(params: {
  accessToken: string
  userId: string
  updates: Partial<UserSettingsData>
  fetchOptions?: RequestInit
}): Promise<UserSettingsData> {
  const url = buildRestUrl("user_settings")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({
      user_id: params.userId,
      ...params.updates,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<UserSettingsData[]>(response)
  return data[0]
}
