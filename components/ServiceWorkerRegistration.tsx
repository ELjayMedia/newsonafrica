"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Skip service worker registration in development or preview environments
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      window.location.hostname === "localhost" ||
      window.location.hostname.includes("vusercontent.net") || // Skip in v0.dev preview
      window.location.hostname.includes("vercel.app") // Skip in Vercel preview
    ) {
      console.log("Service Worker registration skipped in development/preview environment")
      return
    }

    // Use a try-catch block to prevent uncaught errors
    try {
      // Check if the service worker file exists before trying to register it
      fetch("/sw.js", { method: "HEAD" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Service Worker file not found: ${response.status}`)
          }

          // If the file exists, register the service worker
          return navigator.serviceWorker.register("/sw.js").then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope)
          })
        })
        .catch((error) => {
          // Don't show errors in console for preview environments
          if (
            !window.location.hostname.includes("vusercontent.net") &&
            !window.location.hostname.includes("vercel.app")
          ) {
            console.warn("Service Worker registration failed:", error)
          }
        })
    } catch (error) {
      // Catch any unexpected errors
      console.warn("Unexpected error during Service Worker registration:", error)
    }
  }, [])

  return null
}
