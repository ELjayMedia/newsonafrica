"use client"

import { useEffect, useState } from "react"

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

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
          return navigator.serviceWorker.register("/sw.js").then((reg) => {
            console.log("Service Worker registered with scope:", reg.scope)
            setRegistration(reg)

            // Check for updates
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    // New content is available
                    setUpdateAvailable(true)
                  }
                })
              }
            })

            // Listen for waiting service worker
            if (reg.waiting) {
              setUpdateAvailable(true)
            }
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

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" })
      window.location.reload()
    }
  }

  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
        <p className="text-sm mb-2">New content available!</p>
        <div className="flex gap-2">
          <button onClick={handleUpdate} className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">
            Update
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Later
          </button>
        </div>
      </div>
    )
  }

  return null
}
