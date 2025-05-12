import dynamic from "next/dynamic"
import type { ComponentType } from "react"

/**
 * Enhanced dynamic import with error handling for webpack chunk loading errors
 */
export function safeDynamicImport<P = {}>(importFn: () => Promise<{ default: ComponentType<P> }>, options = {}) {
  return dynamic(() => {
    return importFn().catch((err) => {
      // Log the error
      console.error("Error loading dynamic component:", err)

      // If it's a chunk loading error, trigger a page reload
      if (err.message && (err.message.includes("Loading chunk") || err.message.includes("Loading CSS chunk"))) {
        if (typeof window !== "undefined") {
          // Wait a moment before reloading to avoid infinite reload loops
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      }

      // Return a fallback component
      return import("../components/ErrorFallback").then((mod) => mod.default)
    })
  }, options)
}
