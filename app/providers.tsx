"use client"

import type { ReactNode } from "react"
import { useEffect, useState, useCallback } from "react"

import type { AuthStatePayload, ProfileAuthRow } from "@/app/actions/auth"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"
import { ThemeProviderWrapper } from "./ThemeProviderWrapper"
import { UserProvider } from "@/contexts/UserContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesClient"
import { createClient } from "@/lib/supabase/browser-client"
import { mapUserPreferencesRowToSnapshot } from "@/lib/supabase/adapters/user-preferences"

type UserPreferencesBootstrapRow = {
  user_id: string
  theme?: "light" | "dark" | "system" | null
  language?: string | null
  email_notifications?: boolean | null
  push_notifications?: boolean | null
  sections?: string[] | null
  blocked_topics?: string[] | null
  countries?: string[] | null
}

const PROFILE_BOOTSTRAP_SELECT_COLUMNS =
  "id, username, handle, avatar_url, email, full_name, role, preferences, country, created_at, updated_at"
const USER_PREFERENCES_BOOTSTRAP_SELECT_COLUMNS =
  "user_id, theme, language, email_notifications, push_notifications, sections, blocked_topics, countries"

function toProfilePreferences(value: ProfileAuthRow["preferences"]): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

interface ProvidersProps {
  children: ReactNode
  initialAuthState?: AuthStatePayload | null
  initialPreferences?: UserPreferencesSnapshot | null
}

function useClientBootstrap(
  initialAuthState: AuthStatePayload | null | undefined,
  initialPreferences: UserPreferencesSnapshot | null | undefined,
) {
  const [authState, setAuthState] = useState<AuthStatePayload | null>(initialAuthState ?? null)
  const [preferences, setPreferences] = useState<UserPreferencesSnapshot | null>(initialPreferences ?? null)
  const [isBootstrapping, setIsBootstrapping] = useState(initialAuthState === null || initialAuthState === undefined)

  const bootstrap = useCallback(async () => {
    // If we already have server-provided auth state, skip bootstrap
    if (initialAuthState !== null && initialAuthState !== undefined) {
      setIsBootstrapping(false)
      return
    }

    try {
      const supabase = createClient()

      // Get session from browser client
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("[v0] Bootstrap session error:", sessionError)
        setIsBootstrapping(false)
        return
      }

      if (!session?.user) {
        // No session, use defaults
        setAuthState(null)
        setPreferences(mapUserPreferencesRowToSnapshot({ userId: null }))
        setIsBootstrapping(false)
        return
      }

      // Fetch profile if we have a user
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(PROFILE_BOOTSTRAP_SELECT_COLUMNS)
        .eq("id", session.user.id)
        .single<ProfileAuthRow>()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("[v0] Bootstrap profile error:", profileError)
      }

      // Set auth state
      setAuthState({
        session,
        user: session.user,
        profile: profile ?? null,
      })

      // Fetch user preferences if logged in
      if (session.user) {
        const { data: userPrefs, error: prefsError } = await supabase
          .from("user_preferences")
          .select(USER_PREFERENCES_BOOTSTRAP_SELECT_COLUMNS)
          .eq("user_id", session.user.id)
          .single<UserPreferencesBootstrapRow>()

        if (prefsError && prefsError.code !== "PGRST116") {
          console.error("[v0] Bootstrap preferences error:", prefsError)
        }

        setPreferences(
          mapUserPreferencesRowToSnapshot({
            userId: session.user.id,
            preferences: {
              theme: userPrefs.theme ?? DEFAULT_USER_PREFERENCES.theme,
              language: userPrefs.language ?? DEFAULT_USER_PREFERENCES.language,
              emailNotifications: userPrefs.email_notifications ?? DEFAULT_USER_PREFERENCES.emailNotifications,
              pushNotifications: userPrefs.push_notifications ?? DEFAULT_USER_PREFERENCES.pushNotifications,
              sections: userPrefs.sections ?? [...DEFAULT_USER_PREFERENCES.sections],
              blockedTopics: userPrefs.blocked_topics ?? [...DEFAULT_USER_PREFERENCES.blockedTopics],
              countries: userPrefs.countries ?? [...DEFAULT_USER_PREFERENCES.countries],
              commentSort: DEFAULT_USER_PREFERENCES.commentSort,
              bookmarkSort: DEFAULT_USER_PREFERENCES.bookmarkSort,
              lastSubscriptionPlan: DEFAULT_USER_PREFERENCES.lastSubscriptionPlan,
            },
            profilePreferences: parseProfilePreferences(profile?.preferences),
          })
        } else {
          setPreferences({
            userId: session.user.id,
            preferences: {
              ...DEFAULT_USER_PREFERENCES,
              sections: [...DEFAULT_USER_PREFERENCES.sections],
              blockedTopics: [...DEFAULT_USER_PREFERENCES.blockedTopics],
              countries: [...DEFAULT_USER_PREFERENCES.countries],
            },
            profilePreferences: parseProfilePreferences(profile?.preferences),
          })
        }
      }
    } catch (error) {
      console.error("[v0] Bootstrap error:", error)
    } finally {
      setIsBootstrapping(false)
    }
  }, [initialAuthState])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return { authState, preferences, isBootstrapping }
}

export function Providers({ children, initialAuthState = null, initialPreferences = null }: ProvidersProps) {
  const { authState, preferences } = useClientBootstrap(initialAuthState, initialPreferences)

  return (
    <UserProvider initialState={authState}>
      <UserPreferencesProvider snapshot={preferences}>
        <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
      </UserPreferencesProvider>
    </UserProvider>
  )
}
