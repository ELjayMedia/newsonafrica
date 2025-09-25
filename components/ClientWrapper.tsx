"use client"

import type React from "react"
import { SWRConfig } from "swr"
import { useState, useEffect } from "react"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Development performance logging removed to avoid client-side env var issues
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      // Only log in development if we can detect it another way
      if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        console.log(`[Performance] ClientWrapper mounted in ${(endTime - startTime).toFixed(2)}ms`)
      }
    }
  }, [])

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
      {children}
    </SWRConfig>
  )
}
