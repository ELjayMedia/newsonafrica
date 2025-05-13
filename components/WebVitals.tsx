"use client"

import { useEffect } from "react"
import { reportWebVitals, analyzeResourceTiming } from "@/lib/performance-monitoring"

export default function WebVitals() {
  useEffect(() => {
    // Report web vitals
    if (typeof window !== "undefined") {
      import("web-vitals")
        .then((webVitals) => {
          // Check which functions are available in the imported library
          const { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } = webVitals

          // Use each function only if it exists
          if (onCLS) onCLS((metric) => reportWebVitals(metric))
          if (onFID) onFID((metric) => reportWebVitals(metric))
          if (onLCP) onLCP((metric) => reportWebVitals(metric))
          if (onFCP) onFCP((metric) => reportWebVitals(metric))
          if (onTTFB) onTTFB((metric) => reportWebVitals(metric))
          if (onINP) onINP((metric) => reportWebVitals(metric))
        })
        .catch((error) => {
          console.error("Failed to load web-vitals:", error)
        })

      // Analyze resource timing after page load
      window.addEventListener("load", () => {
        // Use setTimeout to ensure this runs after other load handlers
        setTimeout(() => {
          analyzeResourceTiming()
        }, 1000)
      })
    }
  }, [])

  return null
}
