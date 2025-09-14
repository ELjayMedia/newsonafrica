"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw, Home, Bookmark, Search } from "lucide-react"
import { convertLegacyUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"

interface CachedArticle {
  title: string
  url: string
  excerpt?: string
  date?: string
  category?: string
}

export default function OfflineContent() {
  const [isOnline, setIsOnline] = useState(true)
  const [cachedArticles, setCachedArticles] = useState<CachedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadCachedContent = useCallback(async () => {
    try {
      setIsLoading(true)

      // Check if caches API is available
      if (!("caches" in window)) {
        console.log("Cache API not available")
        setIsLoading(false)
        return
      }

      const cacheNames = await caches.keys()
      const newsCache = cacheNames.find((name) => name.includes("news-on-africa"))

      if (!newsCache) {
        console.log("No news cache found")
        setIsLoading(false)
        return
      }

      const cache = await caches.open(newsCache)
      const cachedRequests = await cache.keys()

      // Filter for article pages
      const articleRequests = cachedRequests.filter((request) => {
        const url = new URL(request.url)
        return (
          url.pathname.startsWith("/post/") ||
          url.pathname.includes("/article/") ||
          url.pathname.includes("/category/") ||
          url.pathname === "/" ||
          SUPPORTED_COUNTRIES.some((c) => url.pathname === `/${c}`)
        )
      })

      // Create cached articles list
      const articles: CachedArticle[] = articleRequests.map((request) => {
        const url = new URL(request.url)
        let title = url.pathname
        let category = "General"

        // Format title based on URL
        if (title === "/") {
          title = "News On Africa - Homepage"
          category = "Home"
        } else if (title.startsWith("/post/") || title.includes("/article/")) {
          const slug = title.startsWith("/post/")
            ? title.replace("/post/", "")
            : title.split("/article/")[1] || ""
          title = slug.replace(/-/g, " ")
          title = title.charAt(0).toUpperCase() + title.slice(1)
          category = "Article"
        } else if (title.includes("/category/")) {
          const categoryName = title.split("/category/")[1]?.replace(/-/g, " ") || ""
          title = `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} News`
          category = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
        }

        return {
          title,
          url: convertLegacyUrl(url.pathname),
          category,
          date: "Cached content",
        }
      })

      setCachedArticles(articles.slice(0, 10)) // Limit to 10 items
    } catch (error) {
      console.error("Error loading cached content:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Load cached content
    loadCachedContent()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [loadCachedContent])

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = "/"
    } else {
      // Reload the page to check connection
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {isOnline ? <Wifi className="h-16 w-16 text-green-500" /> : <WifiOff className="h-16 w-16 text-red-500" />}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {isOnline ? "You're Back Online!" : "You're Offline"}
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            {isOnline
              ? "Your internet connection has been restored. You can now access the latest news."
              : "No internet connection detected. You can still browse previously viewed content below."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {isOnline ? "Go to Homepage" : "Try Again"}
            </Button>

            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Homepage
              </Button>
            </Link>
          </div>
        </div>

        {/* Connection Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`p-4 rounded-lg ${isOnline ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
            >
              <p className={`font-medium ${isOnline ? "text-green-800" : "text-red-800"}`}>
                {isOnline ? "✓ Connected to the internet" : "✗ No internet connection"}
              </p>
              <p className={`text-sm mt-1 ${isOnline ? "text-green-600" : "text-red-600"}`}>
                {isOnline
                  ? "You can access all features and the latest news updates."
                  : "Some features may be limited. Cached content is available below."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cached Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Available Offline Content
            </CardTitle>
            <p className="text-sm text-gray-600">
              Articles and pages you've previously visited are cached and available offline.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : cachedArticles.length > 0 ? (
              <div className="space-y-4">
                {cachedArticles.map((article, index) => (
                  <Link
                    key={index}
                    href={article.url}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">{article.category}</span>
                          <span>{article.date}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No cached content available</p>
                <p className="text-sm text-gray-400">
                  Browse some articles while online to have them available offline.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Home className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium">Homepage</h3>
                <p className="text-sm text-gray-500">Latest news and updates</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/bookmarks" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Bookmark className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-medium">Bookmarks</h3>
                <p className="text-sm text-gray-500">Your saved articles</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/search" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-medium">Search</h3>
                <p className="text-sm text-gray-500">Find articles</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
