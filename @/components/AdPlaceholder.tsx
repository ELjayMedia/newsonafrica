"use client"

import { useEffect, useState, useRef } from "react"
import { AdSense } from "@/components/AdSense"

interface AdPlaceholderProps {
  index: number
}

export function AdPlaceholder({ index }: AdPlaceholderProps) {
  const [adAttempted, setAdAttempted] = useState(false)
  const [adLoaded, setAdLoaded] = useState(false)
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Mark that we've attempted to load an ad
    setAdAttempted(true)

    // Check if ad loaded after a delay
    const checkTimer = setTimeout(() => {
      if (adRef.current) {
        const adElement = adRef.current.querySelector("ins.adsbygoogle")
        if (adElement) {
          const status = adElement.getAttribute("data-ad-status")
          setAdLoaded(status === "filled")
        } else {
          setAdLoaded(false)
        }
      }
    }, 2000)

    return () => clearTimeout(checkTimer)
  }, [])

  // If we've attempted to load an ad but it didn't load, return null to collapse the space
  if (adAttempted && !adLoaded) {
    return null
  }

  // Use different slots for different ad positions
  const slot = index % 2 === 0 ? "7364467238" : "7364467238"

  return (
    <div className="my-4" ref={adRef}>
      <AdSense slot={slot} format="rectangle" className="mx-auto" id={`ad-placeholder-${index}`} />
    </div>
  )
}
