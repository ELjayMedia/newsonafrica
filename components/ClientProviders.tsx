"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { UserProvider } from "@/contexts/UserContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"
import { BookmarksProvider } from "@/contexts/BookmarksContext"

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthProvider>
        <UserProvider>
          <UserPreferencesProvider>
            <BookmarksProvider>{children}</BookmarksProvider>
          </UserPreferencesProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
