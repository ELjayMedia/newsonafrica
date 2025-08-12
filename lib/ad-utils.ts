"use client"

export const isBrowser = typeof window !== "undefined"

// Ad configuration and utilities
export const AD_UNITS = {
  HOMEPAGE: {
    TOP_BANNER: "/newsonafrica/web/homepage/top-banner",
    SIDEBAR: "/newsonafrica/web/homepage/sidebar",
    BOTTOM_BANNER: "/newsonafrica/web/homepage/bottom-banner",
  },
  ARTICLE: {
    TOP_BANNER: "/newsonafrica/web/article/top-banner",
    INLINE: "/newsonafrica/web/article/inline",
    SIDEBAR: "/newsonafrica/web/article/sidebar",
    BOTTOM: "/newsonafrica/web/article/bottom",
  },
  CATEGORY: {
    TOP_BANNER: "/newsonafrica/web/category/top-banner",
    INLINE: "/newsonafrica/web/category/inline",
    SIDEBAR: "/newsonafrica/web/category/sidebar",
  },
  MOBILE: {
    HOMEPAGE_BANNER: "/newsonafrica/mobile/homepage/banner",
    ARTICLE_INLINE: "/newsonafrica/mobile/article/inline",
    CATEGORY_BANNER: "/newsonafrica/mobile/category/banner",
  },
}

export const AD_SIZES = {
  LEADERBOARD: [728, 90],
  BANNER: [320, 50],
  RECTANGLE: [300, 250],
  LARGE_RECTANGLE: [336, 280],
  SKYSCRAPER: [160, 600],
  WIDE_SKYSCRAPER: [300, 600],
  MOBILE_BANNER: [320, 50],
  MOBILE_LARGE_BANNER: [320, 100],
}

export const RESPONSIVE_AD_SIZES = {
  LEADERBOARD_RESPONSIVE: [
    [728, 90],
    [320, 50],
  ],
  RECTANGLE_RESPONSIVE: [
    [300, 250],
    [320, 50],
  ],
  SIDEBAR_RESPONSIVE: [
    [300, 250],
    [300, 600],
    [160, 600],
  ],
}

// Utility function to generate unique slot IDs
export function generateSlotId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Utility function to check if ads are blocked
export function checkAdBlocker(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false)
      return
    }

    // Create a test element that ad blockers typically block
    const testAd = document.createElement("div")
    testAd.innerHTML = "&nbsp;"
    testAd.className = "adsbox"
    testAd.style.position = "absolute"
    testAd.style.left = "-10000px"
    testAd.style.width = "1px"
    testAd.style.height = "1px"

    document.body.appendChild(testAd)

    setTimeout(() => {
      const isBlocked = testAd.offsetHeight === 0
      document.body.removeChild(testAd)
      resolve(isBlocked)
    }, 100)
  })
}

// Utility function to refresh all ads on the page
export function refreshAllAds(): void {
  if (typeof window !== "undefined" && window.googletag) {
    window.googletag.cmd.push(() => {
      window.googletag.pubads().refresh()
    })
  }
}

// Utility function to get optimal ad size based on container width
export function getOptimalAdSize(containerWidth: number): number[] {
  if (containerWidth >= 728) {
    return AD_SIZES.LEADERBOARD
  } else if (containerWidth >= 320) {
    return AD_SIZES.BANNER
  } else {
    return AD_SIZES.MOBILE_BANNER
  }
}

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

