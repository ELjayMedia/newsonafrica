import type { ReactNode } from "react"

import type { AuthStatePayload } from "@/app/actions/auth"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"
import { ThemeProvider } from "@/components/theme-provider"
import { UserProvider } from "@/contexts/UserContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"

interface ProvidersProps {
  children: ReactNode
  initialAuthState: AuthStatePayload | null
  initialPreferences: UserPreferencesSnapshot
}

export function Providers({ children, initialAuthState, initialPreferences }: ProvidersProps) {
  return (
    <UserProvider initialState={initialAuthState}>
      <UserPreferencesProvider snapshot={initialPreferences}>
        <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
      </UserPreferencesProvider>
    </UserProvider>
  )
}

function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  "use client"

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      {children}
    </ThemeProvider>
  )
}
