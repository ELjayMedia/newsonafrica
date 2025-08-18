import logger from "@/utils/logger";
import React from "react"
// Performance monitoring and optimization utilities

// Measure component render time
export function measureRenderTime(componentName: string) {
  if (process.env.NODE_ENV !== "production") {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      logger.info(`[Performance] ${componentName} rendered in ${(endTime - startTime).toFixed(2)}ms`)
    }
  }

  return () => {} // No-op in production
}

// Debounce function to limit function calls
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function to limit function calls by time
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Memoize function results
export function memoize<T extends (...args: any[]) => any>(func: T): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>()

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>
    }

    const result = func(...args)
    cache.set(key, result)
    return result
  }
}

// Detect slow renders and report them
export function detectSlowRenders(threshold = 16) {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    const originalCreateElement = React.createElement

    // @ts-ignore - Monkey patching for development only
    React.createElement = function (...args) {
      const start = performance.now()
      const element = originalCreateElement.apply(this, args)
      const end = performance.now()

      const renderTime = end - start
      if (renderTime > threshold) {
        logger.warn(
          `[Performance Warning] Slow render detected: ${args[0]?.displayName || args[0]} took ${renderTime.toFixed(2)}ms`,
        )
      }

      return element
    }
  }
}
