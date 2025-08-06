"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { siteConfig } from "@/config/site"

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
      const measurementId = siteConfig.analytics.googleAnalyticsId
      if (typeof window.gtag === "function" && measurementId) {
        window.gtag("config", measurementId, {
          page_path: url,
        })
      }
    }

    if (pathname) {
      handleRouteChange(pathname + searchParams.toString())
    }
  }, [pathname, searchParams])
}
