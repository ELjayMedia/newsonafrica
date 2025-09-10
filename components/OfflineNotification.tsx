"use client"

import React from "react"
import { AlertTriangle } from "lucide-react"

interface OfflineNotificationProps {
  isOffline: boolean
  message?: string
}

export function OfflineNotification({
  isOffline,
  message = "You are currently offline. Some content may not be up to date.",
}: OfflineNotificationProps) {
  if (!isOffline) return null

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3" role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">{message}</p>
        </div>
      </div>
    </div>
  )
}
