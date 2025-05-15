"use client"

import { useEffect } from "react"
import { reportWebVitals, analyzeResourceTiming } from "@/lib/performance-monitoring"

export default function WebVitals() {
  useEffect(() => {
    // Report web vitals
    if (typeof window !== "undefined") {
      import("web-vitals").then(({ onCLS, onFID, onLCP, onFCP, onTTFB, onINP }) => {
        onCLS((metric) => reportWebVitals(metric))
        onFID((metric) => reportWebVitals(metric))
        onLCP((metric) => reportWebVitals(metric))
        onFCP((metric) => reportWebVitals(metric))
        onTTFB((metric) => reportWebVitals(metric))
        onINP((metric) => reportWebVitals(metric))
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
