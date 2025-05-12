"use client"

import { useEffect } from "react"

// List of critical chunks to preload
const criticalChunks = ["/auth", "/profile", "/bookmarks"]

export function ChunkPreloader() {
  useEffect(() => {
    // Only preload in production and after the main page has loaded
    if (process.env.NODE_ENV !== "production") return

    // Use requestIdleCallback to preload chunks when the browser is idle
    const preloadChunks = () => {
      criticalChunks.forEach((path) => {
        const link = document.createElement("link")
        link.rel = "prefetch"
        link.href = path
        link.as = "fetch"
        link.crossOrigin = "anonymous"
        document.head.appendChild(link)
      })
    }

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preloadChunks, { timeout: 2000 })
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(preloadChunks, 2000)
    }
  }, [])

  // This component doesn't render anything
  return null
}

export default ChunkPreloader
