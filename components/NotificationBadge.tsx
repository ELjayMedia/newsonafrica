import logger from "@/utils/logger";
"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/UserContext"

export function NotificationBadge() {
  const { user } = useUser()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return

    // Fetch notification count
    const fetchNotificationCount = async () => {
      try {
        const response = await fetch("/api/notifications/count")
        if (response.ok) {
          const data = await response.json()
          setCount(data.count)
        }
      } catch (error) {
        logger.error("Error fetching notification count:", error)
      }
    }

    fetchNotificationCount()

    // Set up polling every 2 minutes
    const interval = setInterval(fetchNotificationCount, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user])

  if (count === 0) return null

  return (
    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-4 flex items-center justify-center px-1">
      {count > 9 ? "9+" : count}
    </div>
  )
}
