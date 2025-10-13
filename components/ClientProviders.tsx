"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { UserProvider } from "@/contexts/UserContext"

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <UserProvider>{children}</UserProvider>
    </ThemeProvider>
  )
}
