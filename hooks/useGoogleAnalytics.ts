"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void
  }
}

export const useGoogleAnalytics = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (typeof window.gtag === "function") {
        const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
        if (!gaId) return
        window.gtag("config", gaId, {
          page_path: url,
        })
      }
    }

    if (pathname) {
      handleRouteChange(pathname + searchParams.toString())
    }
  }, [pathname, searchParams])
}
