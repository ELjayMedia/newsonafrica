import type { ReactNode } from "react"

import { Providers } from "../providers"
import { AppChrome } from "../AppChrome"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"

interface AuthedLayoutProps {
  children: ReactNode
}

// These can be used by individual pages that need server-side auth
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

// Auth/preferences will be bootstrapped client-side in Providers
export default function AuthedLayout({ children }: AuthedLayoutProps) {
  return (
    <Providers initialAuthState={null} initialPreferences={null}>
      <AppChrome>{children}</AppChrome>
    </Providers>
  )
}
