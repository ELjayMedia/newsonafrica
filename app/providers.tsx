"use client"

import type { ReactNode } from "react"
import { useEffect, useState, useCallback } from "react"

import type { AuthStatePayload } from "@/app/actions/auth"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"
import { ThemeProviderWrapper } from "./ThemeProviderWrapper"
import { UserProvider } from "@/contexts/UserContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"
import { createClient } from "@/lib/supabase/browser-client"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"

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

  const bootstrap = useCallback(async () => {
    // If we already have server-provided auth state, skip bootstrap
    if (initialAuthState !== null && initialAuthState !== undefined) {
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
        return
      }

      if (!session?.user) {
        // No session, use defaults
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

      // Fetch profile if we have a user
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

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
              theme: (userPrefs.theme as "light" | "dark" | "system") ?? DEFAULT_USER_PREFERENCES.theme,
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
      }
    } catch (error) {
      console.error("[v0] Bootstrap error:", error)
    }
  }, [initialAuthState])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return { authState, preferences }
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
