"use server"

import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { ActionError } from "@/lib/supabase/action-result"
import { sanitizeProfilePreferences, parseProfilePreferences } from "@/lib/preferences/profile-preferences"
import type { RawProfilePreferences, StoredProfilePreferences } from "@/lib/preferences/profile-preferences"
import { withSupabaseSession, type SupabaseServerClient } from "./supabase"
import type { Database } from "@/types/supabase"
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
  type ThemePreference,
  type BookmarkSortPreference,
} from "@/types/user-preferences"
import type { CommentSortOption } from "@/lib/supabase-schema"

export interface UserPreferencesSnapshot {
  userId: string | null
  preferences: UserPreferences
  profilePreferences: RawProfilePreferences
}

export interface UpdatePreferencesInput {
  settings?: {
    theme?: ThemePreference
    language?: string
    email_notifications?: boolean
    push_notifications?: boolean
  }
  content?: {
    sections?: string[]
    blocked_topics?: string[]
    countries?: string[]
  }
}

export interface UpdateProfilePreferencesInput {
  comment_sort?: CommentSortOption
  bookmark_sort?: BookmarkSortPreference
  last_subscription_plan?: string | null
}

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]
type UserPreferencesRow = Database["public"]["Tables"]["user_preferences"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type ProfileSelect = Pick<ProfileRow, "interests" | "preferences">

async function ensureUserSettings(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<UserSettingsRow | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<UserSettingsRow>()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  if (data) {
    return data
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .maybeSingle<UserSettingsRow>()

  if (insertError) {
    throw insertError
  }

  return inserted ?? null
}

async function ensureContentPreferences(
  supabase: SupabaseServerClient,
  userId: string,
  defaultSections: string[],
): Promise<UserPreferencesRow | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<UserPreferencesRow>()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  if (data) {
    return data
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        sections: defaultSections,
        blocked_topics: [],
        countries: [],
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .maybeSingle<UserPreferencesRow>()

  if (insertError) {
    throw insertError
  }

  return inserted ?? null
}

async function fetchProfile(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ProfileSelect | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("interests, preferences")
    .eq("id", userId)
    .maybeSingle<ProfileSelect>()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  if (!data) {
    return null
  }

  return data
}

function resolveSections(
  contentRow: UserPreferencesRow | null,
  defaultSections: string[],
): string[] {
  if (contentRow?.sections && Array.isArray(contentRow.sections) && contentRow.sections.length > 0) {
    return contentRow.sections
  }

  return defaultSections
}

function buildUserPreferences(
  settingsRow: UserSettingsRow | null,
  contentRow: UserPreferencesRow | null,
  storedProfilePreferences: StoredProfilePreferences,
  defaultSections: string[],
): UserPreferences {
  const sections = resolveSections(contentRow, defaultSections)

  return {
    theme: (settingsRow?.theme as ThemePreference) || DEFAULT_USER_PREFERENCES.theme,
    language: settingsRow?.language || DEFAULT_USER_PREFERENCES.language,
    emailNotifications:
      typeof settingsRow?.email_notifications === "boolean"
        ? settingsRow.email_notifications
        : DEFAULT_USER_PREFERENCES.emailNotifications,
    pushNotifications:
      typeof settingsRow?.push_notifications === "boolean"
        ? settingsRow.push_notifications
        : DEFAULT_USER_PREFERENCES.pushNotifications,
    sections,
    blockedTopics: Array.isArray(contentRow?.blocked_topics) ? contentRow.blocked_topics : [],
    countries: Array.isArray(contentRow?.countries) ? contentRow.countries : [],
    commentSort: storedProfilePreferences.comment_sort ?? DEFAULT_USER_PREFERENCES.commentSort,
    bookmarkSort: storedProfilePreferences.bookmark_sort ?? DEFAULT_USER_PREFERENCES.bookmarkSort,
    lastSubscriptionPlan:
      storedProfilePreferences.last_subscription_plan !== undefined
        ? storedProfilePreferences.last_subscription_plan
        : DEFAULT_USER_PREFERENCES.lastSubscriptionPlan,
  }
}

async function ensureUserPreferencesSnapshot(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<UserPreferencesSnapshot> {
  const profile = await fetchProfile(supabase, userId)
  const defaultSections = Array.isArray(profile?.interests) ? (profile?.interests as string[]) : []

  const settingsRow = await ensureUserSettings(supabase, userId)
  const contentRow = await ensureContentPreferences(supabase, userId, defaultSections)

  const { raw: profilePreferencesRaw, stored: storedProfilePreferences, didChange } = sanitizeProfilePreferences(
    profile?.preferences,
  )

  if (didChange) {
    const { error: syncError } = await supabase
      .from("profiles")
      .update({ preferences: profilePreferencesRaw as unknown as ProfilePreferencesColumn })
      .eq("id", userId)

    if (syncError) {
      throw syncError
    }
  }

  return {
    userId,
    preferences: buildUserPreferences(settingsRow, contentRow, storedProfilePreferences, defaultSections),
    profilePreferences: profilePreferencesRaw,
  }
}

export async function getUserPreferences() {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = session?.user?.id ?? null

    if (!userId) {
      return {
        userId: null,
        preferences: DEFAULT_USER_PREFERENCES,
        profilePreferences: {},
      }
    }

    return ensureUserPreferencesSnapshot(supabase, userId)
  })
}

function hasUpdates<T extends object>(value?: T): value is T {
  if (!value) return false
  return Object.values(value).some((entry) => entry !== undefined)
}

export async function updatePreferences(input: UpdatePreferencesInput) {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = session?.user?.id

    if (!userId) {
      throw new ActionError("Authentication required", { status: 401 })
    }

    let didMutate = false

    if (hasUpdates(input.settings)) {
      const { theme, language, email_notifications, push_notifications } = input.settings!
      const payload: Partial<UserSettingsRow> & { user_id: string; updated_at: string } = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      }

      if (theme !== undefined) {
        payload.theme = theme as ThemePreference
      }

      if (language !== undefined) {
        payload.language = language
      }

      if (email_notifications !== undefined) {
        payload.email_notifications = email_notifications
      }

      if (push_notifications !== undefined) {
        payload.push_notifications = push_notifications
      }

      const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" })

      if (error) {
        throw error
      }

      didMutate = true
    }

    if (hasUpdates(input.content)) {
      const payload: Partial<UserPreferencesRow> & { user_id: string } = {
        user_id: userId,
      }

      if (input.content?.sections !== undefined) {
        payload.sections = input.content.sections
      }

      if (input.content?.blocked_topics !== undefined) {
        payload.blocked_topics = input.content.blocked_topics
      }

      if (input.content?.countries !== undefined) {
        payload.countries = input.content.countries
      }

      const { error } = await supabase.from("user_preferences").upsert(payload, { onConflict: "user_id" })

      if (error) {
        throw error
      }

      didMutate = true
    }

    if (didMutate) {
      revalidateByTag(CACHE_TAGS.USERS)
    }

    return ensureUserPreferencesSnapshot(supabase, userId)
  })
}

export async function updateProfilePreferences(input: UpdateProfilePreferencesInput) {
  return withSupabaseSession(async ({ supabase, session }) => {
    const userId = session?.user?.id

    if (!userId) {
      throw new ActionError("Authentication required", { status: 401 })
    }

    let didMutate = false

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle<Pick<ProfileRow, "preferences">>()

    if (profileError && profileError.code !== "PGRST116") {
      throw profileError
    }

    const nextRaw = parseProfilePreferences(profileData?.preferences)

    if (input.comment_sort !== undefined) {
      nextRaw.comment_sort = input.comment_sort
    }

    if (input.bookmark_sort !== undefined) {
      nextRaw.bookmark_sort = input.bookmark_sort
    }

    if (Object.prototype.hasOwnProperty.call(input, "last_subscription_plan")) {
      nextRaw.last_subscription_plan = input.last_subscription_plan ?? null
    }

    const { raw: sanitizedRaw, didChange } = sanitizeProfilePreferences(nextRaw)

    const hasExplicitUpdates =
      input.comment_sort !== undefined ||
      input.bookmark_sort !== undefined ||
      Object.prototype.hasOwnProperty.call(input, "last_subscription_plan")

    if (hasExplicitUpdates || didChange) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ preferences: sanitizedRaw as unknown as ProfilePreferencesColumn })
        .eq("id", userId)

      if (updateError) {
        throw updateError
      }

      didMutate = true
    }

    if (didMutate) {
      revalidateByTag(CACHE_TAGS.USERS)
    }

    return ensureUserPreferencesSnapshot(supabase, userId)
  })
}
