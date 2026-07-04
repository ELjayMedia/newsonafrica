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

            const notifyWaiting = (serviceWorkerRegistration: ServiceWorkerRegistration) => {
              if (serviceWorkerRegistration.waiting) {
                setRegistration(serviceWorkerRegistration)
                setUpdateAvailable(true)
              }
            }

            // Listen for new service workers entering the waiting state
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing
              if (!newWorker) return

              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  notifyWaiting(reg)
                }
              })
            })

            // Capture any already waiting worker on registration
            notifyWaiting(reg)
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
    if (!registration?.waiting) {
      return
    }

    registration.waiting.postMessage({ type: "SKIP_WAITING" })

    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
  }

  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-blue-600 text-white shadow-lg">
        <button
          type="button"
          onClick={handleUpdate}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <span>New version available → Refresh</span>
        </button>
      </div>
    )
  }

  return null
}
