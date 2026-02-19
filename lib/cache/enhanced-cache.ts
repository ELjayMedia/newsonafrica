import { sendToMetricsSink } from "@/lib/metrics/sink"
import type { CacheMetricPayload } from "@/types/metrics"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  staleTime: number
}

class EnhancedCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly maxSize = 1000

  private emitMetric(payload: Omit<CacheMetricPayload, "event">) {
    void sendToMetricsSink(
      {
        event: "cache",
        ...payload,
      },
      { source: "server" },
    ).catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to record cache metric", error)
      }
    })
  }

  set<T>(key: string, data: T, ttl = 300000, staleTime = 600000) {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (typeof oldestKey === "string") {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      staleTime,
    })
  }

  get<T>(key: string): { data: T | null; isStale: boolean; exists: boolean } {
    const entry = this.cache.get(key)
    if (!entry) {
      this.emitMetric({ cacheKey: key, status: "miss", cacheName: "enhanced-cache" })
      return { data: null, isStale: false, exists: false }
    }

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.staleTime) {
      // Data is too stale, remove it
      this.cache.delete(key)
      this.emitMetric({ cacheKey: key, status: "miss", cacheName: "enhanced-cache", metadata: { reason: "stale" } })
      return { data: null, isStale: true, exists: false }
    }

    const isStale = age > entry.ttl
    this.emitMetric({
      cacheKey: key,
      status: "hit",
      cacheName: "enhanced-cache",
      metadata: { isStale },
    })
    return { data: entry.data, isStale, exists: true }
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

export const enhancedCache = new EnhancedCache()
