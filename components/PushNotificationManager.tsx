import logger from '@/utils/logger'
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      checkExistingSubscription()
    }
  }, [])

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()
      setSubscription(existingSubscription)
    } catch (error) {
      logger.error("Error checking subscription:", error)
    }
  }

  const requestPermission = async () => {
    if (!isSupported) return

    setIsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission === "granted") {
        await subscribeToPush()
        toast({
          title: "Notifications enabled",
          description: "You'll now receive breaking news alerts.",
        })
      } else {
        toast({
          title: "Notifications blocked",
          description: "You can enable them later in your browser settings.",
          variant: "destructive",
        })
      }
    } catch (error) {
      logger.error("Error requesting permission:", error)
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready

      // You would need to replace this with your actual VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

      if (!vapidPublicKey) {
        console.warn("VAPID public key not configured")
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      setSubscription(subscription)

      // Send subscription to your server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      })
    } catch (error) {
      logger.error("Error subscribing to push:", error)
    }
  }

  const unsubscribeFromPush = async () => {
    if (!subscription) return

    setIsLoading(true)
    try {
      await subscription.unsubscribe()
      setSubscription(null)

      // Remove subscription from your server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      toast({
        title: "Notifications disabled",
        description: "You won't receive push notifications anymore.",
      })
    } catch (error) {
      logger.error("Error unsubscribing:", error)
      toast({
        title: "Error",
        description: "Failed to disable notifications.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  if (!isSupported) {
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get notified about breaking news and important updates from across Africa.
        </p>

        {permission === "default" && (
          <Button onClick={requestPermission} disabled={isLoading} className="w-full">
            <Bell className="h-4 w-4 mr-2" />
            Enable Notifications
          </Button>
        )}

        {permission === "granted" && subscription && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Bell className="h-4 w-4" />
              Notifications enabled
            </div>
            <Button
              onClick={unsubscribeFromPush}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Disable Notifications
            </Button>
          </div>
        )}

        {permission === "denied" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <BellOff className="h-4 w-4" />
              Notifications blocked
            </div>
            <p className="text-xs text-muted-foreground">
              To enable notifications, please allow them in your browser settings and refresh the page.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
