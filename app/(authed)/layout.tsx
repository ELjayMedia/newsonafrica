import type { ReactNode } from "react"

import { Providers } from "../providers"
import { AppChrome } from "../AppChrome"
import { getCurrentSession, type AuthStatePayload } from "@/app/actions/auth"
import { getUserPreferences, type UserPreferencesSnapshot } from "@/app/actions/preferences"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"

export const dynamic = "force-dynamic"

interface AuthedLayoutProps {
  children: ReactNode
}

function createDefaultPreferencesSnapshot(): UserPreferencesSnapshot {
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

async function resolveInitialAuthState(): Promise<AuthStatePayload | null> {
  try {
    const result = await getCurrentSession()
    if (result.error) {
      console.error("Failed to resolve initial auth state:", result.error)
      return null
    }
    return result.data
  } catch (error) {
    console.error("Unexpected error resolving initial auth state:", error)
    return null
  }
}

async function resolveInitialPreferences(): Promise<UserPreferencesSnapshot> {
  try {
    const result = await getUserPreferences()
    if (result.error || !result.data) {
      if (result.error) {
        console.error("Failed to resolve initial preferences:", result.error)
      }
      return createDefaultPreferencesSnapshot()
    }
    return result.data
  } catch (error) {
    console.error("Unexpected error resolving initial preferences:", error)
    return createDefaultPreferencesSnapshot()
  }
}

export default async function AuthedLayout({ children }: AuthedLayoutProps) {
  const [initialAuthState, initialPreferences] = await Promise.all([
    resolveInitialAuthState(),
    resolveInitialPreferences(),
  ])

  return (
    <Providers initialAuthState={initialAuthState} initialPreferences={initialPreferences}>
      <AppChrome>{children}</AppChrome>
    </Providers>
  )
}
