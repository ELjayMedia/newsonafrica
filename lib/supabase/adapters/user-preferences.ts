import type { RawProfilePreferences, StoredProfilePreferences } from "@/lib/preferences/profile-preferences"
import { sanitizeProfilePreferences } from "@/lib/preferences/profile-preferences"
import type { Database } from "@/types/supabase"
import {
  DEFAULT_USER_PREFERENCES,
  type ThemePreference,
  type UserPreferences,
} from "@/types/user-preferences"

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]
type UserPreferencesRow = Database["public"]["Tables"]["user_preferences"]["Row"]

export interface UserPreferencesSnapshot {
  userId: string | null
  preferences: UserPreferences
  profilePreferences: RawProfilePreferences
}

const THEMES = new Set<ThemePreference>(["light", "dark", "system"])

const asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback]
  }

  return value.filter((entry): entry is string => typeof entry === "string")
}

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback

const asTheme = (value: unknown, fallback: ThemePreference): ThemePreference => {
  if (typeof value === "string" && THEMES.has(value as ThemePreference)) {
    return value as ThemePreference
  }

  return fallback
}

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback

export function mapUserPreferencesRowToUserPreferences(
  settingsRow: UserSettingsRow | null | undefined,
  contentRow: UserPreferencesRow | Record<string, unknown> | null | undefined,
  storedProfilePreferences: StoredProfilePreferences,
  defaultSections: string[] = DEFAULT_USER_PREFERENCES.sections,
): UserPreferences {
  const sections = asStringArray(contentRow?.sections, defaultSections)

  return {
    theme: asTheme(
      settingsRow?.theme ?? (contentRow as Record<string, unknown> | null | undefined)?.theme,
      DEFAULT_USER_PREFERENCES.theme,
    ),
    language: asString(
      settingsRow?.language ?? (contentRow as Record<string, unknown> | null | undefined)?.language,
      DEFAULT_USER_PREFERENCES.language,
    ),
    emailNotifications: asBoolean(
      settingsRow?.email_notifications ??
        (contentRow as Record<string, unknown> | null | undefined)?.email_notifications,
      DEFAULT_USER_PREFERENCES.emailNotifications,
    ),
    pushNotifications: asBoolean(
      settingsRow?.push_notifications ??
        (contentRow as Record<string, unknown> | null | undefined)?.push_notifications,
      DEFAULT_USER_PREFERENCES.pushNotifications,
    ),
    sections,
    blockedTopics: asStringArray(contentRow?.blocked_topics, DEFAULT_USER_PREFERENCES.blockedTopics),
    countries: asStringArray(contentRow?.countries, DEFAULT_USER_PREFERENCES.countries),
    commentSort: storedProfilePreferences.comment_sort ?? DEFAULT_USER_PREFERENCES.commentSort,
    bookmarkSort: storedProfilePreferences.bookmark_sort ?? DEFAULT_USER_PREFERENCES.bookmarkSort,
    lastSubscriptionPlan:
      storedProfilePreferences.last_subscription_plan !== undefined
        ? storedProfilePreferences.last_subscription_plan
        : DEFAULT_USER_PREFERENCES.lastSubscriptionPlan,
  }
}

export function mapUserPreferencesRowToSnapshot(args: {
  userId: string | null
  settingsRow?: UserSettingsRow | null
  contentRow?: UserPreferencesRow | Record<string, unknown> | null
  profilePreferences?: unknown
  defaultSections?: string[]
}): UserPreferencesSnapshot {
  const { raw: profilePreferencesRaw, stored } = sanitizeProfilePreferences(args.profilePreferences)

  return {
    userId: args.userId,
    preferences: mapUserPreferencesRowToUserPreferences(
      args.settingsRow,
      args.contentRow,
      stored,
      args.defaultSections,
    ),
    profilePreferences: profilePreferencesRaw,
  }
}

export function mapProfilePreferencesToStored(value: unknown): {
  raw: RawProfilePreferences
  stored: StoredProfilePreferences
  didChange: boolean
} {
  return sanitizeProfilePreferences(value)
}
