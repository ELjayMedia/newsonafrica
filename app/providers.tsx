"use client"

import type { ReactNode } from "react"
import { useEffect, useState, useCallback } from "react"

import type { AuthStatePayload } from "@/app/actions/auth"
import type { UserPreferencesSnapshot } from "@/lib/supabase/adapters/user-preferences"
import { ThemeProviderWrapper } from "./ThemeProviderWrapper"
import { UserProvider } from "@/contexts/UserContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesClient"
import { createClient } from "@/lib/supabase/browser-client"
import { mapUserPreferencesRowToSnapshot } from "@/lib/supabase/adapters/user-preferences"

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

        setPreferences(
          mapUserPreferencesRowToSnapshot({
            userId: session.user.id,
            contentRow: userPrefs,
            profilePreferences: profile?.preferences,
          }),
        )
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
