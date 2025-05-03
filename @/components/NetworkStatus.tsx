"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff } from "lucide-react"

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [hasReconnected, setHasReconnected] = useState(false)

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine)

    // Event handlers
    const handleOnline = () => {
      setIsOnline(true)
      setHasReconnected(true)
      // Show the status for 5 seconds after reconnecting
      setShowStatus(true)
      setTimeout(() => {
        setShowStatus(false)
        setHasReconnected(false)
      }, 5000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowStatus(true)
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

  // Don't render anything if we're online and haven't just reconnected
  if (isOnline && !showStatus) return null

  return (
    <div
      className={`fixed bottom-16 md:bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 ${
        isOnline
          ? "bg-green-100 text-green-800 border border-green-300"
          : "bg-red-100 text-red-800 border border-red-300"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You are offline</span>
        </>
      )}
    </div>
  )
}
