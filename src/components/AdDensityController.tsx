"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { shouldReduceAds, getRecommendedAdDensity, adExclusionSelectors } from "@/lib/adOptimization"

export function AdDensityController() {
  const pathname = usePathname()

  useEffect(() => {
    // Skip if not in browser
    if (typeof window === "undefined") return

    // Get content length to determine appropriate ad density
    const contentElement = document.querySelector("article") || document.querySelector("main")
    const contentLength = contentElement?.textContent?.length || 0

    // Determine if we should reduce ads on this page
    const reduceAds = shouldReduceAds(pathname)

    // Get recommended ad density based on content length
    const adDensity = getRecommendedAdDensity(contentLength)

    // Apply ad density settings to the document
    document.documentElement.dataset.adDensity = reduceAds ? "low" : adDensity

    // Apply ad exclusion zones
    if (window.adsbygoogle && adExclusionSelectors.length > 0) {
      try {
        // Add data attributes to elements that should not have ads
        adExclusionSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((element) => {
            element.setAttribute("data-ad-exclude", "true")
          })
        })
      } catch (error) {
        console.error("Error setting ad exclusion zones:", error)
      }
    }
  }, [pathname])

  return null // This component doesn't render anything
}
