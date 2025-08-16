"use client"

import { useState, useEffect } from "react"
import { getRelatedPostsCacheStats } from "@/lib/api/wordpress"
import type { CacheStats } from "@/lib/cache/related-posts-cache"

interface CacheMonitorProps {
  showInProduction?: boolean
}

export function CacheMonitor({ showInProduction = false }: CacheMonitorProps) {
  const [stats, setStats] = useState<(CacheStats & { hitRate: number; avgEntrySize: number }) | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Only show in development unless explicitly enabled for production
  const shouldShow = showInProduction || process.env.NODE_ENV === "development"

  useEffect(() => {
    if (!shouldShow) return

    const updateStats = () => {
      try {
        const cacheStats = getRelatedPostsCacheStats()
        setStats(cacheStats)
      } catch (error) {
        console.error("Failed to get cache stats:", error)
      }
    }

    // Update stats immediately and then every 5 seconds
    updateStats()
    const interval = setInterval(updateStats, 5000)

    return () => clearInterval(interval)
  }, [shouldShow])

  if (!shouldShow || !stats) return null

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatPercentage = (value: number) => {
    return (value * 100).toFixed(1) + "%"
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
      >
        Cache Stats
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Related Posts Cache</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Hit Rate:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{formatPercentage(stats.hitRate)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Cache Hits:</span>
              <span className="font-medium">{stats.hits.toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Cache Misses:</span>
              <span className="font-medium">{stats.misses.toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Entries:</span>
              <span className="font-medium">{stats.entryCount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Total Size:</span>
              <span className="font-medium">{formatBytes(stats.totalSize)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Avg Entry Size:</span>
              <span className="font-medium">{formatBytes(stats.avgEntrySize)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Evictions:</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">
                {stats.evictions.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400">Cache updates every 5 seconds</div>
          </div>
        </div>
      )}
    </div>
  )
}
