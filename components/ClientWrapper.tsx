"use client"

import type React from "react"
import { SWRConfig } from "swr"
import { useState, useEffect } from "react"
import { UserProvider } from "@/contexts/UserContext"
import { BookmarksProvider } from "@/contexts/BookmarksContext"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  // Use state to ensure proper hydration
  const [mounted, setMounted] = useState(false)

  // Ensure hydration is complete before rendering
  useEffect(() => {
    setMounted(true)

    // Add performance monitoring in development
    if (process.env.NODE_ENV === "development") {
      const startTime = performance.now()
      return () => {
        const endTime = performance.now()
        console.log(`[Performance] ClientWrapper mounted in ${(endTime - startTime).toFixed(2)}ms`)
      }
    }
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  return (
    <SWRConfig
      value={{
        dedupingInterval: 60 * 1000,
        errorRetryCount: 1,
        revalidateOnFocus: false,
        revalidateOnMount: false,
      }}
    >
      <UserProvider>
        <BookmarksProvider>{children}</BookmarksProvider>
      </UserProvider>
    </SWRConfig>
  )
}
