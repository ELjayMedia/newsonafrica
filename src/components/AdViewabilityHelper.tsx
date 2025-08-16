"use client"

import { useEffect } from "react"

export function AdViewabilityHelper() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Function to improve ad viewability by ensuring content doesn't shift
    const improveAdViewability = () => {
      // Find all ad containers
      const adContainers = document.querySelectorAll(".ad-container, .adsbygoogle, [id^='google_ads_iframe']")

      // Add placeholder height to prevent layout shifts
      adContainers.forEach((container) => {
        if (container instanceof HTMLElement) {
          // Only set min-height if not already set
          if (!container.style.minHeight || container.style.minHeight === "0px") {
            // Set a reasonable min-height based on common ad sizes
            const width = container.offsetWidth

            if (width >= 728) {
              // Likely a leaderboard or large banner
              container.style.minHeight = "90px"
            } else if (width >= 300) {
              // Likely a medium rectangle
              container.style.minHeight = "250px"
            } else {
              // Smaller ad unit
              container.style.minHeight = "100px"
            }
          }
        }
      })
    }

    // Run on initial load
    improveAdViewability()

    // Run again after content has loaded
    if (document.readyState === "complete") {
      improveAdViewability()
    } else {
      window.addEventListener("load", improveAdViewability)
    }

    // Run when window is resized
    window.addEventListener("resize", improveAdViewability)

    // Cleanup
    return () => {
      window.removeEventListener("load", improveAdViewability)
      window.removeEventListener("resize", improveAdViewability)
    }
  }, [])

  return null
}
