"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { UserProvider } from "@/contexts/UserContext"
import type { AuthStatePayload } from "@/app/actions/auth"

interface ProvidersProps {
  children: ReactNode
  initialAuthState: AuthStatePayload | null
}

export function Providers({ children, initialAuthState }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <UserProvider initialState={initialAuthState}>{children}</UserProvider>
    </ThemeProvider>
  )
}
