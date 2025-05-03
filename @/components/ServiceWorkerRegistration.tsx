"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.workbox !== undefined &&
      process.env.NODE_ENV === "production"
    ) {
      // Register the service worker
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope)

          // Check for updates every hour
          setInterval(
            () => {
              registration
                .update()
                .then(() => console.log("Service Worker checked for updates"))
                .catch((err) => console.error("Error checking for SW updates:", err))
            },
            60 * 60 * 1000,
          )
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }
  }, [])

  return null
}
