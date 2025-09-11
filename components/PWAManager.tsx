"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import InstallPrompt from "./InstallPrompt"
import ServiceWorkerRegistration from "./ServiceWorkerRegistration"

interface PWAManagerProps {
  children?: React.ReactNode
}

export default function PWAManager({ children }: PWAManagerProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Back online",
        description: "Your internet connection has been restored.",
        duration: 3000,
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "You're offline",
        description: "Some features may be limited. Cached content is still available.",
        variant: "destructive",
        duration: 5000,
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Listen for service worker updates
    const handleServiceWorkerUpdate = (event: CustomEvent) => {
      setRegistration(event.detail.registration)
      setUpdateAvailable(true)
      toast({
        title: "App update available",
        description: "A new version of the app is ready. Refresh to update.",
        duration: 10000,
      })
    }

    window.addEventListener("sw-update-available" as any, handleServiceWorkerUpdate)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("sw-update-available" as any, handleServiceWorkerUpdate)
    }
  }, [toast])

  const handleUpdateApp = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" })
      window.location.reload()
    }
  }

  return (
    <>
      <ServiceWorkerRegistration />
      <InstallPrompt />

      {/* Update notification */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg">
            <h3 className="font-semibold mb-2">Update Available</h3>
            <p className="text-sm mb-3">A new version of News On Africa is ready.</p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateApp}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium"
              >
                Update Now
              </button>
              <button onClick={() => setUpdateAvailable(false)} className="text-blue-100 px-3 py-1 rounded text-sm">
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm font-medium z-50">
          You're offline. Some features may be limited.
        </div>
      )}

      {children}
    </>
  )
}
