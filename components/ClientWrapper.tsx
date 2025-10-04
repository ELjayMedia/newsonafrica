"use client"

import type React from "react"
import { SWRConfig } from "swr"
import { useEffect } from "react"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const startTime = performance.now()
      return () => {
        const endTime = performance.now()
        console.log(`[Performance] ClientWrapper mounted in ${(endTime - startTime).toFixed(2)}ms`)
      }
    }
  }, [])

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
