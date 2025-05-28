"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  // Always return false during SSR to prevent hydration mismatches
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Only run on client after mount
    if (typeof window === "undefined") return

    // Create media query list
    const media = window.matchMedia(query)

    // Set initial value
    setMatches(media.matches)

    // Create event listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    // Add listener
    media.addEventListener("change", listener)

    // Clean up
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])

  // Return false until mounted to prevent SSR issues
  return mounted ? matches : false
}
