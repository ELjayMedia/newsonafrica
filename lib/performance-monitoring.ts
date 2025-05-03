// lib/performance-monitoring.ts

import { isBrowser } from "@/lib/adUtils"

export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === "development") {
    console.log("Web Vital:", metric)
  }
  // In a real implementation, you would send this data to an analytics service
  // Example:
  // ga('send', 'event', {
  //   eventCategory: 'Web Vitals',
  //   eventAction: metric.name,
  //   eventValue: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), // values must be integers
  //   eventLabel: metric.name,
  //   nonInteraction: true, // avoids affecting bounce rate.
  // });
}

export function analyzeResourceTiming() {
  if (!isBrowser || !("performance" in window)) return

  try {
    const resources = performance.getEntriesByType("resource")

    resources.forEach((resource) => {
      const { name, duration, entryType } = resource

      // Log or send this data to your analytics service
      console.log(`Resource loaded: ${name} (${entryType}) - ${duration.toFixed(2)}ms`)
    })
  } catch (error) {
    console.error("Error analyzing resource timing:", error)
  }
}
