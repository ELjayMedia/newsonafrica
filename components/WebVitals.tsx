"use client"

import { useEffect } from "react"
import { inject } from "@vercel/analytics"

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
            if (typeof webVitals.onCLS === "function")
              webVitals.onCLS((metric) => {
                // Send to Vercel Analytics
                if (window.va) {
                  window.va("track", "Web Vital", {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating,
                  })
                }
              })
            if (typeof webVitals.onFID === "function")
              webVitals.onFID((metric) => {
                if (window.va) {
                  window.va("track", "Web Vital", {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating,
                  })
                }
              })
            if (typeof webVitals.onLCP === "function")
              webVitals.onLCP((metric) => {
                if (window.va) {
                  window.va("track", "Web Vital", {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating,
                  })
                }
              })
            if (typeof webVitals.onFCP === "function")
              webVitals.onFCP((metric) => {
                if (window.va) {
                  window.va("track", "Web Vital", {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating,
                  })
                }
              })
            if (typeof webVitals.onTTFB === "function")
              webVitals.onTTFB((metric) => {
                if (window.va) {
                  window.va("track", "Web Vital", {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating,
                  })
                }
              })

            // Handle INP which might not be available in older versions
            if (typeof webVitals.onINP === "function") {
              webVitals.onINP((metric) => {
                if (window.va) {
                  window.va("track", "Web Vital", {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating,
                  })
                }
              })
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
