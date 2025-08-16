"use client"

import { useEffect } from "react"

export function AdPerformanceMonitor() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Function to monitor ad performance
    const monitorAdPerformance = () => {
      // Check if ads are being blocked
      const adBlockDetected =
        document.querySelectorAll(".adsbygoogle").length > 0 &&
        document.querySelectorAll("ins.adsbygoogle[data-ad-status='filled']").length === 0

      if (adBlockDetected) {
        console.log("Ad blocker may be active - no ads are being displayed")
      }

      // Monitor viewability
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target.classList.contains("adsbygoogle") || entry.target.id?.startsWith("google_ads_iframe")) {
              const adElement = entry.target

              if (entry.isIntersecting) {
                // Ad is visible
                adElement.setAttribute("data-ad-viewed", "true")
              }
            }
          })
        },
        {
          threshold: 0.5, // Consider ad viewed when 50% visible
          rootMargin: "0px",
        },
      )

      // Observe all ad elements
      document.querySelectorAll(".adsbygoogle, [id^='google_ads_iframe']").forEach((ad) => {
        observer.observe(ad)
      })
    }

    // Run after a short delay to allow ads to load
    const timer = setTimeout(monitorAdPerformance, 2000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  return null
}
