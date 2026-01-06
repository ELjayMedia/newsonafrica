"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import {
  getUserPreferences,
  updatePreferences,
  updateProfilePreferences,
  type UserPreferencesSnapshot,
} from "@/app/actions/preferences"
import type { ActionResult } from "@/lib/supabase/action-result"
import {
  extractStoredPreferences,
  parseProfilePreferences,
  type RawProfilePreferences,
  type StoredProfilePreferences,
} from "@/lib/preferences/profile-preferences"
import type { CommentSortOption } from "@/lib/supabase-schema"
import { useUser } from "@/contexts/UserContext"
import {
  DEFAULT_USER_PREFERENCES,
  type BookmarkSortPreference,
  type ThemePreference,
  type UserPreferences,
} from "@/types/user-preferences"

const LOCAL_PROFILE_PREFERENCES_KEY = "noa_profile_preferences"

export interface UserPreferencesContextValue {
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

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined)

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

function persistLocalProfilePreferences(raw: RawProfilePreferences) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(LOCAL_PROFILE_PREFERENCES_KEY, JSON.stringify(raw))
  } catch (error) {
    console.error("Failed to persist local profile preferences", error)
  }
}

function resolveTheme(theme: ThemePreference) {
  if (typeof window === "undefined") return theme
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return theme
}

type PreferencesAction = () => Promise<ActionResult<UserPreferencesSnapshot>>

interface UserPreferencesClientProviderProps {
  children: ReactNode
  initialData: UserPreferencesSnapshot
}

function UserPreferencesClientProvider({ children, initialData }: UserPreferencesClientProviderProps) {
  const { user, loading: userLoading } = useUser()
  const [preferences, setPreferences] = useState<UserPreferences>(initialData.preferences ?? DEFAULT_USER_PREFERENCES)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(Boolean(initialData))
  const [optimisticUpdating, setOptimisticUpdating] = useState(false)
  const [isPending, startTransition] = useTransition()
  const profilePreferencesRef = useRef<RawProfilePreferences>(initialData.profilePreferences ?? {})
  const lastKnownUserIdRef = useRef<string | null>(initialData.userId ?? null)

  const updating = optimisticUpdating || isPending

  const applyTheme = useCallback((theme: ThemePreference) => {
    if (typeof document === "undefined") return
    const resolved = resolveTheme(theme)
    if (resolved === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    try {
      window.localStorage.setItem("noa-theme", resolved)
    } catch (error) {
      console.error("Failed to persist theme preference", error)
    }
  }, [])

  const applySnapshot = useCallback((snapshot: UserPreferencesSnapshot) => {
    setPreferences(snapshot.preferences)
    profilePreferencesRef.current = snapshot.profilePreferences ?? {}
    persistLocalProfilePreferences(profilePreferencesRef.current)
  }, [])

  const applyProfilePreferenceState = useCallback((raw: RawProfilePreferences) => {
    profilePreferencesRef.current = raw
    const stored = extractStoredPreferences(raw)

    setPreferences((prev) => ({
      ...prev,
      commentSort: stored.comment_sort ?? DEFAULT_USER_PREFERENCES.commentSort,
      bookmarkSort: stored.bookmark_sort ?? DEFAULT_USER_PREFERENCES.bookmarkSort,
      lastSubscriptionPlan:
        stored.last_subscription_plan !== undefined
          ? stored.last_subscription_plan
          : DEFAULT_USER_PREFERENCES.lastSubscriptionPlan,
    }))

    persistLocalProfilePreferences(raw)
  }, [])

  const runServerAction = useCallback(
    (executor: PreferencesAction): Promise<void> => {
      return new Promise<void>((resolve) => {
        startTransition(() => {
          setOptimisticUpdating(true)
          executor()
            .then((result) => {
              if (result.data) {
                applySnapshot(result.data)
              } else if (result.error) {
                console.error("Failed to update user preferences:", result.error)
              }
            })
            .catch((error) => {
              console.error("Unexpected error while updating user preferences:", error)
            })
            .finally(() => {
              setOptimisticUpdating(false)
              resolve()
            })
        })
      })
    },
    [applySnapshot, startTransition],
  )

  const refresh = useCallback(async () => {
    if (user && !userLoading) {
      setLoading(true)
      const result = await getUserPreferences()
      if (result.data) {
        applySnapshot(result.data)
      } else if (result.error) {
        console.error("Failed to refresh user preferences:", result.error)
      }
      setLoading(false)
      setInitialized(true)
      return
    }

    const localRaw = loadLocalProfilePreferences()
    const stored = extractStoredPreferences(localRaw)

    setPreferences({
      ...DEFAULT_USER_PREFERENCES,
      commentSort: stored.comment_sort ?? DEFAULT_USER_PREFERENCES.commentSort,
      bookmarkSort: stored.bookmark_sort ?? DEFAULT_USER_PREFERENCES.bookmarkSort,
      lastSubscriptionPlan:
        stored.last_subscription_plan !== undefined
          ? stored.last_subscription_plan
          : DEFAULT_USER_PREFERENCES.lastSubscriptionPlan,
    })
    profilePreferencesRef.current = localRaw
    persistLocalProfilePreferences(localRaw)
    setLoading(false)
    setInitialized(true)
  }, [applySnapshot, user, userLoading])

  useEffect(() => {
    if (userLoading) return

    const userId = user?.id ?? null
    if (userId === lastKnownUserIdRef.current) {
      return
    }

    lastKnownUserIdRef.current = userId

    if (userId) {
      void refresh()
    } else {
      const localRaw = loadLocalProfilePreferences()
      const stored = extractStoredPreferences(localRaw)

      setPreferences({
        ...DEFAULT_USER_PREFERENCES,
        commentSort: stored.comment_sort ?? DEFAULT_USER_PREFERENCES.commentSort,
        bookmarkSort: stored.bookmark_sort ?? DEFAULT_USER_PREFERENCES.bookmarkSort,
        lastSubscriptionPlan:
          stored.last_subscription_plan !== undefined
            ? stored.last_subscription_plan
            : DEFAULT_USER_PREFERENCES.lastSubscriptionPlan,
      })
      profilePreferencesRef.current = localRaw
      persistLocalProfilePreferences(localRaw)
      setInitialized(true)
      setLoading(false)
    }
  }, [refresh, user?.id, userLoading])

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      applyProfilePreferenceState(loadLocalProfilePreferences())
      return
    }

    const localRaw = loadLocalProfilePreferences()
    const localStored = extractStoredPreferences(localRaw)
    const remoteRaw = profilePreferencesRef.current
    const remoteStored = extractStoredPreferences(remoteRaw)

    const updates: StoredProfilePreferences = {}
    const nextRaw: RawProfilePreferences = { ...remoteRaw }

    if (remoteStored.comment_sort === undefined && localStored.comment_sort) {
      nextRaw.comment_sort = localStored.comment_sort
      updates.comment_sort = localStored.comment_sort
    }

    if (remoteStored.bookmark_sort === undefined && localStored.bookmark_sort) {
      nextRaw.bookmark_sort = localStored.bookmark_sort
      updates.bookmark_sort = localStored.bookmark_sort
    }

    if (remoteStored.last_subscription_plan === undefined && localStored.last_subscription_plan !== undefined) {
      nextRaw.last_subscription_plan = localStored.last_subscription_plan
      updates.last_subscription_plan = localStored.last_subscription_plan
    }

    if (Object.keys(updates).length > 0) {
      applyProfilePreferenceState(nextRaw)
      void runServerAction(() => updateProfilePreferences(updates))
    } else {
      persistLocalProfilePreferences(remoteRaw)
    }
  }, [applyProfilePreferenceState, runServerAction, user, userLoading])

  useEffect(() => {
    applyTheme(preferences.theme)
  }, [applyTheme, preferences.theme])

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      setPreferences((prev) => ({ ...prev, theme }))
      applyTheme(theme)

      if (!user) {
        return
      }

      await runServerAction(() => updatePreferences({ settings: { theme } }))
    },
    [applyTheme, runServerAction, user],
  )

  const setLanguage = useCallback(
    async (language: string) => {
      setPreferences((prev) => ({ ...prev, language }))

      if (!user) {
        return
      }

      await runServerAction(() => updatePreferences({ settings: { language } }))
    },
    [runServerAction, user],
  )

  const setNotificationPreferences = useCallback(
    async ({ email, push }: { email?: boolean; push?: boolean }) => {
      const updates: { email_notifications?: boolean; push_notifications?: boolean } = {}

      setPreferences((prev) => ({
        ...prev,
        emailNotifications: typeof email === "boolean" ? email : prev.emailNotifications,
        pushNotifications: typeof push === "boolean" ? push : prev.pushNotifications,
      }))

      if (typeof email === "boolean") {
        updates.email_notifications = email
      }

      if (typeof push === "boolean") {
        updates.push_notifications = push
      }

      if (!user || Object.keys(updates).length === 0) {
        return
      }

      await runServerAction(() => updatePreferences({ settings: updates }))
    },
    [runServerAction, user],
  )

  const updateSections = useCallback(
    async (sections: string[]) => {
      setPreferences((prev) => ({ ...prev, sections }))

      if (!user) {
        return
      }

      await runServerAction(() => updatePreferences({ content: { sections } }))
    },
    [runServerAction, user],
  )

  const updateBlockedTopics = useCallback(
    async (topics: string[]) => {
      setPreferences((prev) => ({ ...prev, blockedTopics: topics }))

      if (!user) {
        return
      }

      await runServerAction(() => updatePreferences({ content: { blocked_topics: topics } }))
    },
    [runServerAction, user],
  )

  const updateFollowedCountries = useCallback(
    async (countries: string[]) => {
      setPreferences((prev) => ({ ...prev, countries }))

      if (!user) {
        return
      }

      await runServerAction(() => updatePreferences({ content: { countries } }))
    },
    [runServerAction, user],
  )

  const setCommentSortPreference = useCallback(
    async (sort: CommentSortOption) => {
      applyProfilePreferenceState({
        ...profilePreferencesRef.current,
        comment_sort: sort,
      })

      if (!user) {
        return
      }

      await runServerAction(() => updateProfilePreferences({ comment_sort: sort }))
    },
    [applyProfilePreferenceState, runServerAction, user],
  )

  const setBookmarkSortPreference = useCallback(
    async (sort: BookmarkSortPreference) => {
      applyProfilePreferenceState({
        ...profilePreferencesRef.current,
        bookmark_sort: sort,
      })

      if (!user) {
        return
      }

      await runServerAction(() => updateProfilePreferences({ bookmark_sort: sort }))
    },
    [applyProfilePreferenceState, runServerAction, user],
  )

  const setLastSubscriptionPlan = useCallback(
    async (planId: string | null) => {
      applyProfilePreferenceState({
        ...profilePreferencesRef.current,
        last_subscription_plan: planId ?? null,
      })

      if (!user) {
        return
      }

      await runServerAction(() => updateProfilePreferences({ last_subscription_plan: planId ?? null }))
    },
    [applyProfilePreferenceState, runServerAction, user],
  )

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      preferences,
      loading,
      updating,
      initialized,
      refresh,
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
      loading,
      preferences,
      refresh,
      setBookmarkSortPreference,
      setCommentSortPreference,
      setLanguage,
      setLastSubscriptionPlan,
      setNotificationPreferences,
      setTheme,
      updateBlockedTopics,
      updateFollowedCountries,
      updateSections,
      updating,
    ],
  )

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
}

interface UserPreferencesProviderProps {
  children: ReactNode
  snapshot: UserPreferencesSnapshot | null
}

function normalizeSnapshot(snapshot: UserPreferencesSnapshot | null): UserPreferencesSnapshot {
  if (!snapshot) {
    return {
      userId: null,
      preferences: {
        ...DEFAULT_USER_PREFERENCES,
        sections: [...DEFAULT_USER_PREFERENCES.sections],
        blockedTopics: [...DEFAULT_USER_PREFERENCES.blockedTopics],
        countries: [...DEFAULT_USER_PREFERENCES.countries],
      },
      profilePreferences: {},
    }
  }

  const mergedPreferences = {
    ...DEFAULT_USER_PREFERENCES,
    ...(snapshot.preferences ?? DEFAULT_USER_PREFERENCES),
  }

  return {
    userId: snapshot.userId ?? null,
    preferences: {
      ...mergedPreferences,
      sections: [...mergedPreferences.sections],
      blockedTopics: [...mergedPreferences.blockedTopics],
      countries: [...mergedPreferences.countries],
    },
    profilePreferences: { ...(snapshot.profilePreferences ?? {}) },
  }
}

export function UserPreferencesProvider({ children, snapshot }: UserPreferencesProviderProps) {
  const initialData = useMemo(() => normalizeSnapshot(snapshot), [snapshot])
  return <UserPreferencesClientProvider initialData={initialData}>{children}</UserPreferencesClientProvider>
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error("useUserPreferences must be used within a UserPreferencesProvider")
  }
  return context
}

export type { ThemePreference, BookmarkSortPreference, UserPreferences }
