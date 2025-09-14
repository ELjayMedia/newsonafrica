"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { SendIcon as SyncIcon } from "lucide-react"

export default function BackgroundSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Register background sync if supported
    if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
      registerBackgroundSync()
    }

    // Listen for sync events
    const handleSyncComplete = (event: CustomEvent) => {
      setIsSyncing(false)
      setLastSync(new Date())
      toast({
        title: "Content updated",
        description: "Latest news has been synced in the background.",
        duration: 3000,
      })
    }

    const handleSyncStart = () => {
      setIsSyncing(true)
    }

    window.addEventListener("sync-complete" as any, handleSyncComplete)
    window.addEventListener("sync-start" as any, handleSyncStart)

    return () => {
      window.removeEventListener("sync-complete" as any, handleSyncComplete)
      window.removeEventListener("sync-start" as any, handleSyncStart)
    }
  }, [toast])

  const registerBackgroundSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register("background-news-sync")
      console.log("Background sync registered")
    } catch (error) {
      console.error("Background sync registration failed:", error)
    }
  }

  const triggerManualSync = async () => {
    setIsSyncing(true)
    try {
      // Trigger a manual sync by posting a message to the service worker
      const registration = await navigator.serviceWorker.ready
      if (registration.active) {
        registration.active.postMessage({
          type: "MANUAL_SYNC",
          timestamp: Date.now(),
        })
      }

      toast({
        title: "Syncing content",
        description: "Checking for latest news updates...",
      })
    } catch (error) {
      console.error("Manual sync failed:", error)
      setIsSyncing(false)
      toast({
        title: "Sync failed",
        description: "Unable to sync content. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <button
        onClick={triggerManualSync}
        disabled={isSyncing}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        title="Sync latest content"
      >
        <SyncIcon className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : "Sync"}
      </button>

      {lastSync && <span className="text-xs">Last updated: {lastSync.toLocaleTimeString()}</span>}
    </div>
  )
}
