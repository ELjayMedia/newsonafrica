"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { WifiOff, RefreshCw, BookOpen, List, Home } from "lucide-react"
import Link from "next/link"
import { convertLegacyUrl } from "@/lib/utils/routing"

interface OfflineFallbackProps {
  type?: "article" | "list" | "general"
  title?: string
  showCachedContent?: boolean
}

interface CachedItem {
  title: string
  url: string
  type: "article" | "category" | "home"
  timestamp: number
}

export default function OfflineFallback({
  type = "general",
  title = "Content Unavailable",
  showCachedContent = true,
}: OfflineFallbackProps) {
  const [cachedItems, setCachedItems] = useState<CachedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    loadCachedContent()
  }, [])

  const loadCachedContent = async () => {
    if (!showCachedContent) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      if (!("caches" in window)) {
        setIsLoading(false)
        return
      }

      const cacheNames = await caches.keys()
      const relevantCaches = cacheNames.filter((name) => name.includes("news-on-africa") || name.includes("api-cache"))

      const allCachedItems: CachedItem[] = []

      for (const cacheName of relevantCaches) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()

        for (const request of requests) {
          const url = new URL(request.url)

          // Skip API calls and assets
          if (url.pathname.startsWith("/api/") || url.pathname.includes(".") || url.pathname === "/offline") {
            continue
          }

          let itemType: "article" | "category" | "home" = "home"
          let itemTitle = url.pathname

          if (url.pathname === "/") {
            itemTitle = "News On Africa - Homepage"
            itemType = "home"
          } else if (url.pathname.startsWith("/post/") || url.pathname.includes("/article/")) {
            itemTitle = url.pathname.split("/").pop()?.replace(/-/g, " ") || "Article"
            itemTitle = itemTitle.charAt(0).toUpperCase() + itemTitle.slice(1)
            itemType = "article"
          } else if (url.pathname.startsWith("/category/")) {
            const category = url.pathname.replace("/category/", "").replace(/-/g, " ")
            itemTitle = `${category.charAt(0).toUpperCase() + category.slice(1)} News`
            itemType = "category"
          }

          allCachedItems.push({
            title: itemTitle,
            url: convertLegacyUrl(url.pathname),
            type: itemType,
            timestamp: Date.now(),
          })
        }
      }

      // Sort by type preference and limit results
      const sortedItems = allCachedItems
        .sort((a, b) => {
          if (type === "article" && a.type === "article" && b.type !== "article") return -1
          if (type === "list" && a.type === "category" && b.type !== "category") return -1
          return 0
        })
        .slice(0, 8)

      setCachedItems(sortedItems)
    } catch (error) {
      console.error("Error loading cached content:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async () => {
    setIsRetrying(true)

    // Wait a moment to show the loading state
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (navigator.onLine) {
      window.location.reload()
    } else {
      setIsRetrying(false)
    }
  }

  const getIcon = () => {
    switch (type) {
      case "article":
        return <BookOpen className="w-12 h-12 text-gray-400" />
      case "list":
        return <List className="w-12 h-12 text-gray-400" />
      default:
        return <WifiOff className="w-12 h-12 text-gray-400" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case "article":
        return "Article Unavailable Offline"
      case "list":
        return "Content List Unavailable"
      default:
        return title
    }
  }

  const getDescription = () => {
    switch (type) {
      case "article":
        return "This article requires an internet connection to load. Check your connection and try again, or browse cached articles below."
      case "list":
        return "This content list requires an internet connection. You can still access previously viewed articles below."
      default:
        return "This content is not available offline. Please check your internet connection and try again."
    }
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6">{getIcon()}</div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">{getTitle()}</h2>

      <p className="text-gray-600 mb-6 max-w-md">{getDescription()}</p>

      <div className="flex gap-3 mb-8">
        <Button onClick={handleRetry} disabled={isRetrying} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Retrying..." : "Try Again"}
        </Button>

        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </div>

      {showCachedContent && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Available Offline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : cachedItems.length > 0 ? (
              <div className="space-y-2">
                {cachedItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.url}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0">
                      {item.type === "article" ? (
                        <BookOpen className="w-5 h-5 text-blue-500" />
                      ) : item.type === "category" ? (
                        <List className="w-5 h-5 text-green-500" />
                      ) : (
                        <Home className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {item.type === "home" ? "Homepage" : item.type}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-2">No cached content available</p>
                <p className="text-sm text-gray-400">Browse articles while online to access them offline later.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
