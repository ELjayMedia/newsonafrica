"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"

interface ThemeProviderWrapperProps {
  children: ReactNode
}

export function ThemeProviderWrapper({ children }: ThemeProviderWrapperProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      {children}
    </ThemeProvider>
  )
}
