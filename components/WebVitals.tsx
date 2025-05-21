"use client"

import { useEffect } from "react"
import { inject } from "@vercel/analytics"
import { sendWebVitalToVercel } from "@/lib/performance-monitoring"

export default function WebVitals() {
  useEffect(() => {
    // Initialize Vercel Analytics
    inject()

    // Report web vitals with proper error handling
    if (typeof window !== "undefined") {
      // Import the web-vitals library
      import("web-vitals")
        .then((webVitals) => {
          try {
            // Check which functions are available and use them
            if (typeof webVitals.onCLS === "function") webVitals.onCLS(sendWebVitalToVercel)
            if (typeof webVitals.onFID === "function") webVitals.onFID(sendWebVitalToVercel)
            if (typeof webVitals.onLCP === "function") webVitals.onLCP(sendWebVitalToVercel)
            if (typeof webVitals.onFCP === "function") webVitals.onFCP(sendWebVitalToVercel)
            if (typeof webVitals.onTTFB === "function") webVitals.onTTFB(sendWebVitalToVercel)

            // Handle INP which might not be available in older versions
            if (typeof webVitals.onINP === "function") {
              webVitals.onINP(sendWebVitalToVercel)
            }

            // Fallback for older versions that use getCLS, getFID, etc.
            if (typeof webVitals.getCLS === "function") {
              webVitals.getCLS(sendWebVitalToVercel)
              webVitals.getFID(sendWebVitalToVercel)
              webVitals.getLCP(sendWebVitalToVercel)
              webVitals.getFCP(sendWebVitalToVercel)
              webVitals.getTTFB(sendWebVitalToVercel)
            }

            console.log("Web Vitals monitoring initialized")
          } catch (error) {
            console.error("Failed to initialize web vitals:", error)
          }
        })
        .catch((error) => {
          console.error("Failed to load web-vitals library:", error)
        })
    }
  }, [])

  return null
}
