"use client"

import type { ReactNode } from "react"

import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"

interface ClientUserPreferencesProviderProps {
  children: ReactNode
}

export function ClientUserPreferencesProvider({ children }: ClientUserPreferencesProviderProps) {
  return <UserPreferencesProvider>{children}</UserPreferencesProvider>
}
