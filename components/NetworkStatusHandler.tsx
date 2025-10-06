"use client"

import { useEffect, useState } from "react"

import { isOnline as getIsOnlineStatus, setupNetworkListeners } from "@/utils/network-utils"

export function NetworkStatusHandler() {
  const [isOnline, setIsOnline] = useState(() => getIsOnlineStatus())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log("Application is online")
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log("Application is offline")
    }

    // Ensure state is synced when the component mounts
    setIsOnline(getIsOnlineStatus())

    return setupNetworkListeners(handleOnline, handleOffline)
  }, [])

  // Only render notification when offline
  if (isOnline) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-warning-dark text-warning-foreground p-2 text-center z-50"
      role="status"
      aria-live="polite"
    >
      You are currently offline. Some features may be limited.
    </div>
  )
}
