// Check if we're in a browser environment
export const isBrowser = typeof window !== "undefined"

// Load AdSense script once
export function loadAdSenseScript() {
  if (!isBrowser) return Promise.reject("Not in browser environment")

  return new Promise<void>((resolve, reject) => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6089753674605524"
    script.async = true
    script.crossOrigin = "anonymous"

    script.onload = () => resolve()
    script.onerror = (error) => reject(error)

    document.head.appendChild(script)
  })
}

// Initialize AdSense ads
export function initializeAd(adElement: HTMLElement) {
  if (!isBrowser || !adElement) return false

  try {
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    return true
  } catch (error) {
    console.error("Error initializing ad:", error)
    return false
  }
}

// Check if an ad is visible/filled
export function isAdFilled(adElement: HTMLElement): boolean {
  if (!isBrowser || !adElement) return false

  const insElement = adElement.querySelector("ins.adsbygoogle")
  if (!insElement) return false

  // Check if ad is filled
  return !(
    insElement.innerHTML.trim() === "" ||
    insElement.offsetHeight <= 10 ||
    insElement.getAttribute("data-ad-status") === "unfilled"
  )
}

// Defer execution to browser idle time
export function runWhenIdle(callback: () => void, timeout = 2000) {
  if (!isBrowser) return

  if ("requestIdleCallback" in window) {
    ;(window as any).requestIdleCallback(callback, { timeout })
  } else {
    setTimeout(callback, timeout)
  }
}
