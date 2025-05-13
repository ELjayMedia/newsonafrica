"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  // Default to false on server to prevent hydration issues
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Only run on client after mount
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

  // Return false during server-side rendering
  return mounted ? matches : false
}

// Add a default export for dynamic import
export default { useMediaQuery }
