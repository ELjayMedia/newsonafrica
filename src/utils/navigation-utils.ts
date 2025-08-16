export function isUsingBrowserNavigation(): boolean {
  if (typeof window === "undefined") return false

  // performance.navigation is deprecated but still widely supported
  if (performance.navigation) {
    // TYPE_BACK_FORWARD = 2
    return performance.navigation.type === 2
  }

  // For newer browsers that support Navigation Timing API Level 2
  if (performance.getEntriesByType && "navigation" in performance) {
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    if (navEntries.length > 0) {
      return navEntries[0].type === "back_forward"
    }
  }

  return false
}

// Check if the current navigation is a page reload/refresh
export function isPageReload(): boolean {
  if (typeof window === "undefined") return false

  if (performance.navigation) {
    // TYPE_RELOAD = 1
    return performance.navigation.type === 1
  }

  if (performance.getEntriesByType && "navigation" in performance) {
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    if (navEntries.length > 0) {
      return navEntries[0].type === "reload"
    }
  }

  return false
}
