export function isOnline(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" ? navigator.onLine : true // Assume online if we can't detect
}

// Add event listeners for online/offline status
export function setupNetworkListeners(onOnline: () => void, onOffline: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("online", onOnline)
  window.addEventListener("offline", onOffline)

  return () => {
    window.removeEventListener("online", onOnline)
    window.removeEventListener("offline", onOffline)
  }
}

// Retry a function with exponential backoff
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let retries = 0
  let delay = initialDelay

  while (true) {
    try {
      return await fn()
    } catch (error) {
      retries++
      if (retries >= maxRetries) {
        throw error
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
}

// Check if an error is likely due to network issues
export function isNetworkError(error: any): boolean {
  if (!error) return false

  const errorMessage = error.message || String(error)
  const networkErrorKeywords = [
    "network",
    "fetch",
    "timeout",
    "abort",
    "offline",
    "failed to fetch",
    "net::",
    "NetworkError",
    "ECONNREFUSED",
    "ETIMEDOUT",
  ]

  return networkErrorKeywords.some((keyword) => errorMessage.toLowerCase().includes(keyword.toLowerCase()))
}
