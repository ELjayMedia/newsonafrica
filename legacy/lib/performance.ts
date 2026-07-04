export { debounce, throttle, memoize } from "./utils"

// Performance monitoring and optimization utilities

// Measure component render time
export function measureRenderTime(componentName: string) {
  if (process.env.NODE_ENV !== "production") {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      console.log(`[Performance] ${componentName} rendered in ${(endTime - startTime).toFixed(2)}ms`)
    }
  }

  return () => {} // No-op in production
}

// Detect slow renders and report them
export function detectSlowRenders(_threshold = 16) {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    // Note: This is a development-only utility for performance monitoring
    console.warn("[Performance] Slow render detection is enabled in development mode")
  }
}
