"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, Wifi, RefreshCw, X } from "lucide-react"

interface RetryBannerProps {
  onRetry?: () => void
  autoRetry?: boolean
  retryInterval?: number
  maxRetries?: number
}

export default function RetryBanner({
  onRetry,
  autoRetry = true,
  retryInterval = 5000,
  maxRetries = 3,
}: RetryBannerProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastFailedRequest, setLastFailedRequest] = useState<string | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(false)
      setRetryCount(0)
      setIsDismissed(false)
      console.log("[v0] Network connection restored")
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
      setIsDismissed(false)
      console.log("[v0] Network connection lost")
    }

    // Listen for network events
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Listen for failed fetch requests
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)

        // If request fails with network error, show retry banner
        if (!response.ok && (response.status === 0 || response.status >= 500)) {
          const url = typeof args[0] === "string" ? args[0] : args[0].url
          setLastFailedRequest(url)
          if (!isDismissed) {
            setShowBanner(true)
          }
        }

        return response
      } catch (error) {
        // Network error occurred
        const url = typeof args[0] === "string" ? args[0] : args[0].url
        setLastFailedRequest(url)
        if (!isDismissed) {
          setShowBanner(true)
        }
        throw error
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.fetch = originalFetch
    }
  }, [isDismissed])

  // Auto-retry logic
  useEffect(() => {
    if (!autoRetry || !showBanner || isOnline || retryCount >= maxRetries) {
      return
    }

    const timer = setTimeout(() => {
      handleRetry()
    }, retryInterval)

    return () => clearTimeout(timer)
  }, [showBanner, retryCount, autoRetry, retryInterval, maxRetries, isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryCount((prev) => prev + 1)

    try {
      // Test network connectivity
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-cache",
      })

      if (response.ok) {
        setShowBanner(false)
        setRetryCount(0)
        setIsDismissed(false)

        // Call custom retry handler if provided
        if (onRetry) {
          onRetry()
        } else {
          // Default behavior: reload the page
          window.location.reload()
        }
      }
    } catch (error) {
      console.log("[v0] Retry failed:", error)

      // If we've reached max retries, stop auto-retrying
      if (retryCount >= maxRetries - 1) {
        console.log("[v0] Max retries reached")
      }
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setIsDismissed(true)
    setRetryCount(0)
  }

  // Don't show banner if dismissed or if we're online and no failed requests
  if (!showBanner || (isOnline && !lastFailedRequest)) {
    return null
  }

  const getStatusIcon = () => {
    if (isRetrying) {
      return <RefreshCw className="w-4 h-4 animate-spin" />
    }
    if (isOnline) {
      return <Wifi className="w-4 h-4 text-green-500" />
    }
    return <WifiOff className="w-4 h-4 text-red-500" />
  }

  const getStatusMessage = () => {
    if (isRetrying) {
      return `Retrying connection... (${retryCount}/${maxRetries})`
    }
    if (!isOnline) {
      return "No internet connection detected"
    }
    if (lastFailedRequest) {
      return "Some content failed to load"
    }
    return "Connection issues detected"
  }

  const getVariant = () => {
    if (isOnline && lastFailedRequest) return "default"
    return "destructive"
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert variant={getVariant()} className="shadow-lg border-2">
        <div className="flex items-center gap-3">
          {getStatusIcon()}

          <div className="flex-1">
            <AlertDescription className="font-medium">{getStatusMessage()}</AlertDescription>
            {lastFailedRequest && (
              <AlertDescription className="text-xs mt-1 opacity-75">
                Last failed: {new URL(lastFailedRequest).pathname}
              </AlertDescription>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isRetrying && retryCount < maxRetries && (
              <Button onClick={handleRetry} size="sm" variant={isOnline ? "default" : "secondary"} className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}

            <Button onClick={handleDismiss} size="sm" variant="ghost" className="p-1 h-auto">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {autoRetry && retryCount < maxRetries && !isOnline && (
          <div className="mt-2 text-xs opacity-75">
            Auto-retry in {Math.ceil(retryInterval / 1000)}s... ({maxRetries - retryCount} attempts remaining)
          </div>
        )}
      </Alert>
    </div>
  )
}
