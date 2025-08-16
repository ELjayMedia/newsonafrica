"use client"

import { useEffect } from "react"

interface AdSenseAutoAdsProps {
  publisherId?: string
}

export function AdSenseAutoAds({ publisherId = "ca-pub-6089753674605524" }: AdSenseAutoAdsProps) {
  useEffect(() => {
    // Check if script already exists to avoid duplicates
    if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
      return
    }

    try {
      // Create and append the AdSense Auto Ads script
      const script = document.createElement("script")
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`
      script.async = true
      script.crossOrigin = "anonymous"
      script.id = "adsense-auto-ads-script"
      document.head.appendChild(script)

      // Add event listeners for script load/error
      script.addEventListener("load", () => {
        console.log("AdSense Auto Ads script loaded successfully")
      })

      script.addEventListener("error", (error) => {
        console.error("Error loading AdSense Auto Ads script:", error)
      })
    } catch (error) {
      console.error("Error setting up AdSense Auto Ads:", error)
    }

    // Cleanup function
    return () => {
      // We don't remove the script on cleanup as it should persist across page navigations
    }
  }, [publisherId])

  return null // This component doesn't render anything
}
