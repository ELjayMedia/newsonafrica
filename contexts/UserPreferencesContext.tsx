"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/utils/supabase/client"
import type { Database } from "@/types/supabase"
import type { CommentSortOption } from "@/lib/supabase-schema"

export type ThemePreference = "light" | "dark" | "system"

export type BookmarkSortPreference = "newest" | "oldest" | "title" | "unread"

interface UserPreferences {
  theme: ThemePreference
  language: string
  emailNotifications: boolean
  pushNotifications: boolean
  sections: string[]
  blockedTopics: string[]
  countries: string[]
  commentSort: CommentSortOption
  bookmarkSort: BookmarkSortPreference
  lastSubscriptionPlan: string | null
}

interface UserPreferencesContextValue {
  preferences: UserPreferences
  loading: boolean
  updating: boolean
  initialized: boolean
  refresh: () => Promise<void>
  setTheme: (theme: ThemePreference) => Promise<void>
  setLanguage: (language: string) => Promise<void>
  setNotificationPreferences: (notifications: { email?: boolean; push?: boolean }) => Promise<void>
  updateSections: (sections: string[]) => Promise<void>
  updateBlockedTopics: (topics: string[]) => Promise<void>
  updateFollowedCountries: (countries: string[]) => Promise<void>
  setCommentSortPreference: (sort: CommentSortOption) => Promise<void>
  setBookmarkSortPreference: (sort: BookmarkSortPreference) => Promise<void>
  setLastSubscriptionPlan: (planId: string | null) => Promise<void>
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "en",
  emailNotifications: true,
  pushNotifications: true,
  sections: [],
  blockedTopics: [],
  countries: [],
  commentSort: "newest",
  bookmarkSort: "newest",
  lastSubscriptionPlan: null,
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined)

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]
type UserPreferencesRow = Database["public"]["Tables"]["user_preferences"]["Row"]

type RawProfilePreferences = Record<string, unknown>

type StoredProfilePreferences = {
  comment_sort?: CommentSortOption
  bookmark_sort?: BookmarkSortPreference
  last_subscription_plan?: string | null
}

const LOCAL_PROFILE_PREFERENCES_KEY = "noa_profile_preferences"

function isRecord(value: unknown): value is RawProfilePreferences {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseProfilePreferences(value: unknown): RawProfilePreferences {
  if (isRecord(value)) {
    return { ...value }
  }
  return {}
}

function extractStoredPreferences(raw: RawProfilePreferences): StoredProfilePreferences {
  const stored: StoredProfilePreferences = {}

  if (typeof raw.comment_sort === "string" && ["newest", "oldest", "popular"].includes(raw.comment_sort)) {
    stored.comment_sort = raw.comment_sort as CommentSortOption
  }

  if (typeof raw.bookmark_sort === "string" && ["newest", "oldest", "title", "unread"].includes(raw.bookmark_sort)) {
    stored.bookmark_sort = raw.bookmark_sort as BookmarkSortPreference
  }

  if (raw.last_subscription_plan === null || typeof raw.last_subscription_plan === "string") {
    stored.last_subscription_plan = raw.last_subscription_plan
  }

  return stored
}

function loadLocalProfilePreferences(): RawProfilePreferences {
  if (typeof window === "undefined") return {}

  const stored = window.localStorage.getItem(LOCAL_PROFILE_PREFERENCES_KEY)
  if (!stored) return {}

  try {
    const parsed = JSON.parse(stored)
    return parseProfilePreferences(parsed)
  } catch (error) {
    console.error("Failed to parse local profile preferences", error)
    return {}
  }
}

function resolveTheme(theme: ThemePreference) {
  if (typeof window === "undefined") return theme
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return theme
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, ensureSessionFreshness } = useUser()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const profilePreferencesRef = useRef<RawProfilePreferences>({})

  const applyProfilePreferenceState = useCallback((raw: RawProfilePreferences) => {
    profilePreferencesRef.current = raw
    const stored = extractStoredPreferences(raw)

    setPreferences((prev) => ({
      ...prev,
      commentSort: stored.comment_sort ?? DEFAULT_PREFERENCES.commentSort,
      bookmarkSort: stored.bookmark_sort ?? DEFAULT_PREFERENCES.bookmarkSort,
      lastSubscriptionPlan:
        stored.last_subscription_plan !== undefined
          ? stored.last_subscription_plan
          : DEFAULT_PREFERENCES.lastSubscriptionPlan,
    }))
  }, [])

  const persistProfilePreferences = useCallback(
    async (updates: Partial<StoredProfilePreferences>) => {
      const nextRaw: RawProfilePreferences = {
        ...profilePreferencesRef.current,
        ...updates,
      }

      applyProfilePreferenceState(nextRaw)

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LOCAL_PROFILE_PREFERENCES_KEY, JSON.stringify(nextRaw))
        } catch (error) {
          console.error("Failed to persist local profile preferences", error)
        }
      }

      if (!user) {
        return
      }

      setUpdating(true)
      try {
        await ensureSessionFreshness()

        const { error } = await supabase.from("profiles").update({ preferences: nextRaw }).eq("id", user.id)

        if (error) {
          throw error
        }
      } catch (error) {
        console.error("Failed to update profile preferences:", error)
      } finally {
        setUpdating(false)
      }
    },
    [applyProfilePreferenceState, ensureSessionFreshness, supabase, user],
  )

  const applyTheme = useCallback((theme: ThemePreference) => {
    if (typeof document === "undefined") return
    const resolved = resolveTheme(theme)
    if (resolved === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const loadPreferences = useCallback(async () => {
    if (!user) {
      const localRaw = loadLocalProfilePreferences()
      profilePreferencesRef.current = localRaw
      const stored = extractStoredPreferences(localRaw)

      setPreferences({
        ...DEFAULT_PREFERENCES,
        commentSort: stored.comment_sort ?? DEFAULT_PREFERENCES.commentSort,
        bookmarkSort: stored.bookmark_sort ?? DEFAULT_PREFERENCES.bookmarkSort,
        lastSubscriptionPlan:
          stored.last_subscription_plan !== undefined
            ? stored.last_subscription_plan
            : DEFAULT_PREFERENCES.lastSubscriptionPlan,
      })
      setLoading(false)
      setInitialized(true)
      return
    }

    setLoading(true)
    try {
      await ensureSessionFreshness()

      const [{ data: settingsData, error: settingsError }, { data: prefsData, error: prefsError }] = await Promise.all([
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle<UserSettingsRow>(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle<UserPreferencesRow>(),
      ])

      if (settingsError && settingsError.code !== "PGRST116") {
        console.error("Error loading user settings:", settingsError)
      }

      if (prefsError && prefsError.code !== "PGRST116") {
        console.error("Error loading content preferences:", prefsError)
      }

      let settingsRow = settingsData
      if (!settingsRow) {
        await ensureSessionFreshness()

        const { data: insertedSettings, error: insertError } = await supabase
          .from("user_settings")
          .upsert({ user_id: user.id }, { onConflict: "user_id" })
          .select("*")
          .maybeSingle<UserSettingsRow>()

        if (insertError) {
          console.error("Error creating default user settings:", insertError)
        }
        settingsRow = insertedSettings ?? null
      }

      let contentRow = prefsData
      if (!contentRow) {
        const defaultSections = Array.isArray(profile?.interests) ? (profile?.interests as string[]) : []
        await ensureSessionFreshness()

        const { data: insertedPreferences, error: preferencesError } = await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: user.id,
              sections: defaultSections,
              blocked_topics: [],
              countries: [],
            },
            { onConflict: "user_id" },
          )
          .select("*")
          .maybeSingle<UserPreferencesRow>()

        if (preferencesError) {
          console.error("Error creating default content preferences:", preferencesError)
        }
        contentRow = insertedPreferences ?? null
      }

      const sections =
        (contentRow?.sections && contentRow.sections.length > 0
          ? contentRow.sections
          : (Array.isArray(profile?.interests) ? (profile?.interests as string[]) : [])) || []

      const profileRaw = parseProfilePreferences(profile?.preferences)
      const fallbackRaw = loadLocalProfilePreferences()
      const fallbackStored = extractStoredPreferences(fallbackRaw)
      const sanitizedProfileStored = extractStoredPreferences(profileRaw)
      let shouldSyncProfilePrefs = false

      if (profileRaw.comment_sort !== undefined && sanitizedProfileStored.comment_sort === undefined) {
        delete profileRaw.comment_sort
        shouldSyncProfilePrefs = true
      }

      if (profileRaw.bookmark_sort !== undefined && sanitizedProfileStored.bookmark_sort === undefined) {
        delete profileRaw.bookmark_sort
        shouldSyncProfilePrefs = true
      }

      if (
        profileRaw.last_subscription_plan !== undefined &&
        sanitizedProfileStored.last_subscription_plan === undefined
      ) {
        delete profileRaw.last_subscription_plan
        shouldSyncProfilePrefs = true
      }

      if (sanitizedProfileStored.comment_sort === undefined && fallbackStored.comment_sort) {
        profileRaw.comment_sort = fallbackStored.comment_sort
        sanitizedProfileStored.comment_sort = fallbackStored.comment_sort
        shouldSyncProfilePrefs = true
      }

      if (sanitizedProfileStored.bookmark_sort === undefined && fallbackStored.bookmark_sort) {
        profileRaw.bookmark_sort = fallbackStored.bookmark_sort
        sanitizedProfileStored.bookmark_sort = fallbackStored.bookmark_sort
        shouldSyncProfilePrefs = true
      }

      if (
        sanitizedProfileStored.last_subscription_plan === undefined &&
        fallbackStored.last_subscription_plan !== undefined
      ) {
        profileRaw.last_subscription_plan = fallbackStored.last_subscription_plan
        sanitizedProfileStored.last_subscription_plan = fallbackStored.last_subscription_plan
        shouldSyncProfilePrefs = true
      }

      profilePreferencesRef.current = profileRaw

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LOCAL_PROFILE_PREFERENCES_KEY, JSON.stringify(profileRaw))
        } catch (error) {
          console.error("Failed to persist local profile preferences", error)
        }
      }

      setPreferences({
        theme: (settingsRow?.theme as ThemePreference) || DEFAULT_PREFERENCES.theme,
        language: settingsRow?.language || DEFAULT_PREFERENCES.language,
        emailNotifications:
          typeof settingsRow?.email_notifications === "boolean"
            ? settingsRow.email_notifications
            : DEFAULT_PREFERENCES.emailNotifications,
        pushNotifications:
          typeof settingsRow?.push_notifications === "boolean"
            ? settingsRow.push_notifications
            : DEFAULT_PREFERENCES.pushNotifications,
        sections,
        blockedTopics: contentRow?.blocked_topics || [],
        countries: contentRow?.countries || [],
        commentSort: sanitizedProfileStored.comment_sort ?? DEFAULT_PREFERENCES.commentSort,
        bookmarkSort: sanitizedProfileStored.bookmark_sort ?? DEFAULT_PREFERENCES.bookmarkSort,
        lastSubscriptionPlan:
          sanitizedProfileStored.last_subscription_plan !== undefined
            ? sanitizedProfileStored.last_subscription_plan
            : DEFAULT_PREFERENCES.lastSubscriptionPlan,
      })

      if (shouldSyncProfilePrefs) {
        try {
          await ensureSessionFreshness()
          await supabase.from("profiles").update({ preferences: profileRaw }).eq("id", user.id)
        } catch (preferencesSyncError) {
          console.error("Failed to sync profile preferences:", preferencesSyncError)
        }
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [ensureSessionFreshness, profile?.interests, profile?.preferences, supabase, user])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    applyTheme(preferences.theme)
  }, [applyTheme, preferences.theme])
  const updateSettings = useCallback(
    async (updates: Partial<UserSettingsRow>) => {
      if (!user) {
        const nextTheme = (updates.theme as ThemePreference) || preferences.theme

        setPreferences((prev) => ({
          ...prev,
          theme: nextTheme,
          language: updates.language || prev.language,
          emailNotifications:
            typeof updates.email_notifications === "boolean" ? updates.email_notifications : prev.emailNotifications,
          pushNotifications:
            typeof updates.push_notifications === "boolean" ? updates.push_notifications : prev.pushNotifications,
        }))

        applyTheme(nextTheme)
        return
      }
      setUpdating(true)
      try {
        await ensureSessionFreshness()

        const payload: Partial<UserSettingsRow> & { user_id: string; updated_at?: string } = {
          user_id: user.id,
          updated_at: new Date().toISOString(),
          ...updates,
        }

        const { data, error } = await supabase
          .from("user_settings")
          .upsert(payload, { onConflict: "user_id" })
          .select("*")
          .single<UserSettingsRow>()

        if (error) {
          throw error
        }

        setPreferences((prev) => ({
          ...prev,
          theme: (data.theme as ThemePreference) || prev.theme,
          language: data.language || prev.language,
          emailNotifications:
            typeof data.email_notifications === "boolean" ? data.email_notifications : prev.emailNotifications,
          pushNotifications:
            typeof data.push_notifications === "boolean" ? data.push_notifications : prev.pushNotifications,
        }))
      } catch (error) {
        console.error("Failed to update user settings:", error)
      } finally {
        setUpdating(false)
      }
    },
    [ensureSessionFreshness, supabase, user],
  )

  const updateContentPreferences = useCallback(
    async (updates: Partial<UserPreferencesRow>) => {
      if (!user) return
      setUpdating(true)
      try {
        await ensureSessionFreshness()

        const payload: UserPreferencesRow = {
          user_id: user.id,
          sections: updates.sections ?? preferences.sections,
          blocked_topics: updates.blocked_topics ?? preferences.blockedTopics,
          countries: updates.countries ?? preferences.countries,
        }

        const { data, error } = await supabase
          .from("user_preferences")
          .upsert(payload, { onConflict: "user_id" })
          .select("*")
          .single<UserPreferencesRow>()

        if (error) {
          throw error
        }

        setPreferences((prev) => ({
          ...prev,
          sections: data.sections || [],
          blockedTopics: data.blocked_topics || [],
          countries: data.countries || [],
        }))
      } catch (error) {
        console.error("Failed to update content preferences:", error)
      } finally {
        setUpdating(false)
      }
    },
    [
      ensureSessionFreshness,
      preferences.blockedTopics,
      preferences.countries,
      preferences.sections,
      supabase,
      user,
    ],
  )

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      await updateSettings({ theme })
    },
    [updateSettings],
  )

  const setLanguage = useCallback(
    async (language: string) => {
      await updateSettings({ language })
    },
    [updateSettings],
  )

  const setNotificationPreferences = useCallback(
    async ({ email, push }: { email?: boolean; push?: boolean }) => {
      const updates: Partial<UserSettingsRow> = {}
      if (typeof email === "boolean") {
        updates.email_notifications = email
      }
      if (typeof push === "boolean") {
        updates.push_notifications = push
      }
      if (Object.keys(updates).length === 0) return
      await updateSettings(updates)
    },
    [updateSettings],
  )

  const updateSections = useCallback(
    async (sections: string[]) => {
      await updateContentPreferences({ sections })
    },
    [updateContentPreferences],
  )

  const updateBlockedTopics = useCallback(
    async (topics: string[]) => {
      await updateContentPreferences({ blocked_topics: topics })
    },
    [updateContentPreferences],
  )

  const updateFollowedCountries = useCallback(
    async (countries: string[]) => {
      await updateContentPreferences({ countries })
    },
    [updateContentPreferences],
  )
  const setCommentSortPreference = useCallback(
    async (sort: CommentSortOption) => {
      await persistProfilePreferences({ comment_sort: sort })
    },
    [persistProfilePreferences],
  )

  const setBookmarkSortPreference = useCallback(
    async (sort: BookmarkSortPreference) => {
      await persistProfilePreferences({ bookmark_sort: sort })
    },
    [persistProfilePreferences],
  )

  const setLastSubscriptionPlan = useCallback(
    async (planId: string | null) => {
      await persistProfilePreferences({ last_subscription_plan: planId ?? null })
    },
    [persistProfilePreferences],
  )
  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      preferences,
      loading,
      updating,
      initialized,
      refresh: loadPreferences,
      setTheme,
      setLanguage,
      setNotificationPreferences,
      updateSections,
      updateBlockedTopics,
      updateFollowedCountries,
      setCommentSortPreference,
      setBookmarkSortPreference,
      setLastSubscriptionPlan,
    }),
    [
      initialized,
      loadPreferences,
      loading,
      preferences,
      setLanguage,
      setNotificationPreferences,
      setTheme,
      setBookmarkSortPreference,
      setCommentSortPreference,
      setLastSubscriptionPlan,
      updateBlockedTopics,
      updateFollowedCountries,
      updateSections,
      updating,
    ],
  )

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error("useUserPreferences must be used within a UserPreferencesProvider")
  }
  return context
}
