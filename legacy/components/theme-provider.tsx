"use client"

import * as React from "react"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: "light" | "dark"
  attribute?: string
}

const STORAGE_KEY = "noa-theme"

export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  React.useEffect(() => {
    const root = document.documentElement
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const theme = stored === "dark" || stored === "light" ? stored : defaultTheme
    root.classList.toggle("dark", theme === "dark")
  }, [defaultTheme])

  return <>{children}</>
}
