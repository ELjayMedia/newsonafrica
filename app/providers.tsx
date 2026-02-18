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

type DbUserPreferencesRow = {
  user_id: string
  theme?: "light" | "dark" | "system" | null
  language?: string | null
  email_notifications?: boolean | null
  push_notifications?: boolean | null
  sections?: string[] | null
  blocked_topics?: string[] | null
  countries?: string[] | null
}

function useClientBootstrap(
  initialAuthState: AuthStatePayload | null | undefined,
  initialPreferences: UserPreferencesSnapshot | null | undefined,
) {
  const [authState, setAuthState] = useState<AuthStatePayload | null>(initialAuthState ?? null)
  const [preferences, setPreferences] = useState<UserPreferencesSnapshot | null>(initialPreferences ?? null)
  const [isBootstrapping, setIsBootstrapping] = useState(initialAuthState === null || initialAuthState === undefined)

  const bootstrap = useCallback(async () => {
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
        setIsBootstrapping(false)
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
        setIsBootstrapping(false)
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

      const { data: userPrefsRaw, error: prefsError } = await supabase
        .from("user_preferences")
        .select("user_id, theme, language, email_notifications, push_notifications, sections, blocked_topics, countries")
        .eq("user_id", session.user.id)
        .single()

      if (prefsError && prefsError.code !== "PGRST116") {
        console.error("[v0] Bootstrap preferences error:", prefsError)
      }

      const userPrefs = (userPrefsRaw ?? null) as DbUserPreferencesRow | null

      if (userPrefs) {
        setPreferences({
          userId: session.user.id,
          preferences: {
            theme: (userPrefs.theme ?? DEFAULT_USER_PREFERENCES.theme) as "light" | "dark" | "system",
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
          profilePreferences: profile?.preferences ?? {},
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
          profilePreferences: profile?.preferences ?? {},
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
  const { authState, preferences, isBootstrapping } = useClientBootstrap(initialAuthState, initialPreferences)

  return (
    <UserProvider initialState={authState}>
      <UserPreferencesProvider snapshot={preferences}>
        <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
      </UserPreferencesProvider>
    </UserProvider>
  )
}
