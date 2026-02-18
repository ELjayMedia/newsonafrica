"use client"

import type { ReactNode } from "react"
import { useEffect, useState, useCallback } from "react"

import type { AuthStatePayload } from "@/app/actions/auth"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"
import { ThemeProviderWrapper } from "./ThemeProviderWrapper"
import { UserProvider } from "@/contexts/UserContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesClient"
import { createClient } from "@/lib/supabase/browser-client"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"

interface ProvidersProps {
  children: ReactNode
  initialAuthState?: AuthStatePayload | null
  initialPreferences?: UserPreferencesSnapshot | null
}

/**
 * `profiles.preferences` is a JSON/JSONB column in Supabase.
 * Keep it as a plain object to avoid TS union issues.
 */
type ProfilePreferences = Record<string, unknown>

function normalizeProfilePreferences(value: unknown): ProfilePreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as ProfilePreferences
}

function normalizeTheme(value: unknown): "light" | "dark" | "system" {
  return value === "light" || value === "dark" || value === "system" ? value : DEFAULT_USER_PREFERENCES.theme
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

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("[v0] Bootstrap session error:", sessionError)
        return
      }

      if (!session?.user) {
        setAuthState(null)
        setPreferences({
          userId: null,
          preferences: {
            ...DEFAULT_USER_PREFERENCES,
            sections: [...DEFAULT_USER_PREFERENCES.sections],
            blockedTopics: [...DEFAULT_USER_PREFERENCES.blockedTopics],
            countries: [...DEFAULT_USER_PREFERENCES.countries],
          },
          profilePreferences: {},
        })
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("[v0] Bootstrap profile error:", profileError)
      }

      setAuthState({
        session,
        user: session.user,
        profile: profile ?? null,
      })

      const profilePreferences = normalizeProfilePreferences((profile as any)?.preferences)

      const { data: userPrefs, error: prefsError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", session.user.id)
        .single()

      if (prefsError && prefsError.code !== "PGRST116") {
        console.error("[v0] Bootstrap preferences error:", prefsError)
      }

      if (userPrefs) {
        setPreferences({
          userId: session.user.id,
          preferences: {
            theme: normalizeTheme((userPrefs as any).theme),
            language: (userPrefs as any).language ?? DEFAULT_USER_PREFERENCES.language,
            emailNotifications: (userPrefs as any).email_notifications ?? DEFAULT_USER_PREFERENCES.emailNotifications,
            pushNotifications: (userPrefs as any).push_notifications ?? DEFAULT_USER_PREFERENCES.pushNotifications,
            sections: (userPrefs as any).sections ?? [...DEFAULT_USER_PREFERENCES.sections],
            blockedTopics: (userPrefs as any).blocked_topics ?? [...DEFAULT_USER_PREFERENCES.blockedTopics],
            countries: (userPrefs as any).countries ?? [...DEFAULT_USER_PREFERENCES.countries],
            commentSort: DEFAULT_USER_PREFERENCES.commentSort,
            bookmarkSort: DEFAULT_USER_PREFERENCES.bookmarkSort,
            lastSubscriptionPlan: DEFAULT_USER_PREFERENCES.lastSubscriptionPlan,
          },
          profilePreferences,
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
          profilePreferences,
        })
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