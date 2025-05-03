"use client"

import { useEffect, useRef, useState } from "react"
import { useInView } from "react-intersection-observer"

interface AdComponentProps {
  zoneId: string
  className?: string
}

const adSizes: { [key: string]: { width: number; height: number } } = {
  "4": { width: 728, height: 90 }, // Desktop Top Banner
  "5": { width: 300, height: 600 }, // Sidebar
  "6": { width: 300, height: 250 }, // Sidebar Rectangle
  "7": { width: 300, height: 250 }, // Desktop Category
  "10": { width: 728, height: 90 }, // Desktop Header Top
  "11": { width: 728, height: 90 }, // Desktop Below Header
  "12": { width: 468, height: 60 }, // Desktop Home After Hero
  "13": { width: 468, height: 60 }, // Desktop Home Mid Content
  "14": { width: 336, height: 280 }, // Desktop In-Article Ad 1
  "15": { width: 336, height: 280 }, // Desktop In-Article Ad 2
  "16": { width: 468, height: 60 }, // Mobile Top Banner
  "17": { width: 468, height: 60 }, // Mobile Below Header
  "18": { width: 300, height: 250 }, // Mobile Home After Hero
  "19": { width: 300, height: 250 }, // Mobile Home Mid Content
  "20": { width: 300, height: 250 }, // Mobile In-Article Ad 1
  "21": { width: 300, height: 250 }, // Mobile In-Article Ad 2
  "22": { width: 468, height: 60 }, // Mobile Footer Banner
  "23": { width: 728, height: 90 }, // Desktop Footer Banner
}

export function AdComponent({ zoneId, className = "" }: AdComponentProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAdVisible, setIsAdVisible] = useState(false)
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
  })

  useEffect(() => {
    if (inView && !isLoaded) {
      const script = document.createElement("script")
      script.async = true
      script.src = "//eljaymedia.com/ads/www/delivery/asyncjs.php"
      script.onload = () => {
        if (typeof window.reviveAsync === "undefined") {
          window.reviveAsync = {}
        }
        if (typeof window.reviveAsync["3ea47296c61f085860a90368599773fe"] === "undefined") {
          window.reviveAsync["3ea47296c61f085860a90368599773fe"] = {}
        }
        if (typeof window.reviveAsync["3ea47296c61f085860a90368599773fe"].push === "undefined") {
          window.reviveAsync["3ea47296c61f085860a90368599773fe"].push = (zoneId) => {
            const zone = document.querySelector(`ins[data-revive-zoneid="${zoneId}"]`)
            if (zone) {
              const script = document.createElement("script")
              script.async = true
              script.src = `//eljaymedia.com/ads/www/delivery/asyncjs.php?zoneid=${zoneId}&cb=${Math.random()}`
              zone.appendChild(script)
            }
          }
        }
        window.reviveAsync["3ea47296c61f085860a90368599773fe"].push(zoneId)
        setIsLoaded(true)
      }
      document.body.appendChild(script)

      return () => {
        document.body.removeChild(script)
      }
    }
  }, [inView, isLoaded, zoneId])

  useEffect(() => {
    const checkAdVisibility = () => {
      if (adRef.current) {
        const rect = adRef.current.getBoundingClientRect()
        const isVisible = rect.width > 0 && rect.height > 0
        setIsAdVisible(isVisible)
      }
    }

    checkAdVisibility()
    window.addEventListener("resize", checkAdVisibility)
    return () => window.removeEventListener("resize", checkAdVisibility)
  }, [isLoaded]) //Removed unnecessary dependency

  const { width, height } = adSizes[zoneId] || { width: 0, height: 0 }

  if (!isAdVisible) {
    return null
  }

  return (
    <div
      ref={ref}
      className={`ad-component mx-auto ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: "#f0f0f0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {inView && (
        <div ref={adRef}>
          <ins
            className="adsbyeljaymedia"
            data-revive-zoneid={zoneId}
            data-revive-id="3ea47296c61f085860a90368599773fe"
            style={{ display: "inline-block", width: `${width}px`, height: `${height}px` }}
          ></ins>
        </div>
      )}
      {!inView && <div>Ad</div>}
    </div>
  )
}
