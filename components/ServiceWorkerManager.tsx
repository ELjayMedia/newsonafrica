"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Download, X } from "lucide-react"

export function ServiceWorkerManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[v0] Service Worker registered successfully:", registration.scope)

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              setInstalling(true)
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content is available
                  setUpdateAvailable(true)
                  setShowUpdatePrompt(true)
                  setInstalling(false)
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("[v0] Service Worker registration failed:", error)
        })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SKIP_WAITING") {
          setUpdateAvailable(true)
          setShowUpdatePrompt(true)
        }
      })
    }
  }, [])

  const handleUpdate = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" })
    }
    window.location.reload()
  }

  const dismissUpdate = () => {
    setShowUpdatePrompt(false)
  }

  if (!showUpdatePrompt) return null

  return (
    <Alert className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto border-info bg-info/10">
      <Download className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm">{installing ? "Installing update..." : "New version available!"}</span>
        <div className="flex items-center space-x-2">
          {!installing && (
            <>
              <Button size="sm" onClick={handleUpdate} disabled={installing}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Update
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissUpdate}>
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
