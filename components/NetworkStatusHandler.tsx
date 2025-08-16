"use client"

import { useEffect, useState } from "react"

export function NetworkStatusHandler() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)

  useEffect(() => {
    // Update network status
    const handleOnline = () => {
      setIsOnline(true)
      console.log("Application is online")
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log("Application is offline")
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Clean up
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Only render notification when offline
  if (isOnline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50">
      You are currently offline. Some features may be limited.
    </div>
  )
}
