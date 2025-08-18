import logger from "@/utils/logger";
import env from "@/lib/config/env";
import { isBrowser } from "@/lib/ad-utils"
import type { Metric } from "web-vitals"

// Send web vitals to Vercel Analytics
export function sendWebVitalToVercel(metric: Metric) {
  try {
    // Log in development for debugging
    if (env.NODE_ENV === "development") {
      logger.info(`Web Vital: ${metric.name} = ${metric.value}`)
    }

    // Ensure we're in a browser environment with the required APIs
    if (!isBrowser || typeof window === "undefined") return

    // Send to Vercel Analytics
    const body = {
      dsn: env.NEXT_PUBLIC_SENTRY_DSN || "", // Use Sentry DSN as identifier
      id: metric.id,
      page: window.location.pathname,
      href: window.location.href,
      event_name: metric.name,
      value: metric.value.toString(),
      speed: getConnectionSpeed(),
    }

    // Use `navigator.sendBeacon()` if available
    const url = "/api/analytics/vitals"
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(body)], { type: "application/json" })
      navigator.sendBeacon(url, blob)
    } else {
      fetch(url, {
        body: JSON.stringify(body),
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch((err) => {
        logger.error("Failed to send web vital:", err)
      })
    }
  } catch (error) {
    logger.error("Error sending web vital:", error)
  }
}

// Legacy function for backward compatibility
export function reportWebVitals(metric: any) {
  try {
    sendWebVitalToVercel(metric)
  } catch (error) {
    logger.error("Error in reportWebVitals:", error)
  }
}

// Get connection speed for additional context
function getConnectionSpeed() {
  if (!isBrowser || !("connection" in navigator)) return "unknown"

  try {
    // @ts-ignore - TypeScript doesn't know about navigator.connection
    const connection = navigator.connection

    if (!connection) return "unknown"
    if (connection.saveData) return "saveData"
    if (connection.effectiveType) return connection.effectiveType
  } catch (error) {
    logger.error("Error getting connection speed:", error)
  }

  return "unknown"
}

export function analyzeResourceTiming() {
  if (!isBrowser || !("performance" in window)) return

  try {
    const resources = performance.getEntriesByType("resource")
    const resourceStats = resources.map((resource) => {
      const { name, duration, initiatorType, transferSize } = resource
      return {
        url: name,
        duration: Math.round(duration),
        initiatorType,
        transferSize: Math.round(transferSize / 1024), // KB
      }
    })

    // Filter out resources that are too small or fast to matter
    const significantResources = resourceStats.filter((r) => r.duration > 200 || r.transferSize > 50)

    // Send to analytics endpoint
    if (significantResources.length > 0) {
      fetch("/api/analytics/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: window.location.pathname,
          resources: significantResources.slice(0, 10), // Limit to 10 resources
        }),
        keepalive: true,
      }).catch((err) => {
        logger.error("Failed to send resource timing data:", err)
      })
    }
  } catch (error) {
    logger.error("Error analyzing resource timing:", error)
  }
}
