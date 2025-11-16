import type { ReactNode } from "react"

import type { AuthStatePayload } from "@/app/actions/auth"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"
import { ThemeProviderWrapper } from "./ThemeProviderWrapper"
import { UserProvider } from "@/contexts/UserContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"

interface ProvidersProps {
  children: ReactNode
  initialAuthState?: AuthStatePayload | null
  initialPreferences?: UserPreferencesSnapshot | null
}

export function Providers({
  children,
  initialAuthState = null,
  initialPreferences = null,
}: ProvidersProps) {
  return (
    <UserProvider initialState={initialAuthState}>
      <UserPreferencesProvider snapshot={initialPreferences}>
        <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
      </UserPreferencesProvider>
    </UserProvider>
  )
}
