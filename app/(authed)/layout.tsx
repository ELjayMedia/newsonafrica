import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { Providers } from "../providers"
import { AppChrome } from "../AppChrome"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"
import { createServerClient } from "@/lib/supabase/server"

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

export default async function AuthedLayout({ children }: AuthedLayoutProps) {
  const supabase = await createServerClient()

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth")
    }
  }

  return (
    <Providers initialAuthState={null} initialPreferences={null}>
      <AppChrome>{children}</AppChrome>
    </Providers>
  )
}
