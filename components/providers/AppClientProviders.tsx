"use client"

import type { ReactNode } from "react"

import { Providers } from "@/app/providers"
import { ClientUserPreferencesProvider } from "@/app/ClientUserPreferencesProvider"

interface AppClientProvidersProps {
  children: ReactNode
}

export default function AppClientProviders({ children }: AppClientProvidersProps) {
  return (
    <Providers initialAuthState={null}>
      <ClientUserPreferencesProvider>{children}</ClientUserPreferencesProvider>
    </Providers>
  )
}
