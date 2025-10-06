"use client"

import { useEffect, useState } from "react"

import { isOnline as getIsOnlineStatus, setupNetworkListeners } from "@/utils/network-utils"

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => getIsOnlineStatus())

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Sync state on mount in case the initial render occurred before hydration
    setIsOnline(getIsOnlineStatus())

    return setupNetworkListeners(handleOnline, handleOffline)
  }, [])

  if (isOnline) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-warning-dark text-warning-foreground p-2 text-center z-50"
      role="status"
      aria-live="polite"
    >
      <p className="font-medium">You are currently offline. Some features may be unavailable.</p>
    </div>
  )
}
