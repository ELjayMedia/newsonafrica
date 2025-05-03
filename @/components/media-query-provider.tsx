"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"

// Create context for media queries
type MediaQueryContextType = {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const MediaQueryContext = createContext<MediaQueryContextType>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
})

// Export hook to use the media query context
export const useMediaQueryContext = () => useContext(MediaQueryContext)

// Provider component
export function MediaQueryProvider({ children }: { children: ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)")
  const isDesktop = useMediaQuery("(min-width: 1025px)")

  return <MediaQueryContext.Provider value={{ isMobile, isTablet, isDesktop }}>{children}</MediaQueryContext.Provider>
}
