"use client"

import { useEffect, useRef, useState } from "react"
import { useInView } from "react-intersection-observer"
import { useAdManager } from "./AdManager"

interface AdComponentProps {
  adUnit: string
  width: number
  height: number
  slotId: string
  responsiveSizes?: number[][]
  className?: string
  targeting?: Record<string, string | string[]>
}

export function AdComponent({
  adUnit,
  width,
  height,
  slotId,
  responsiveSizes,
  className = "",
  targeting = {},
}: AdComponentProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [slot, setSlot] = useState<any>(null)
  const { isGPTLoaded, registerAdSlot, unregisterAdSlot } = useAdManager()

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: "200px 0px",
  })

  useEffect(() => {
    if (!inView || !isGPTLoaded) return

    const initializeAd = () => {
      if (typeof window === "undefined" || !window.googletag) return

      window.googletag.cmd.push(() => {
        try {
          // Destroy existing slot if it exists
          if (slot) {
            window.googletag.destroySlots([slot])
          }

          // Define the ad slot
          const adSize = responsiveSizes || [[width, height]]
          const newSlot = window.googletag.defineSlot(adUnit, adSize, slotId)

          if (newSlot) {
            newSlot.addService(window.googletag.pubads())

            // Set targeting parameters
            Object.entries(targeting).forEach(([key, value]) => {
              newSlot.setTargeting(key, value)
            })

            setSlot(newSlot)
            registerAdSlot(slotId)

            // Display the ad
            window.googletag.display(slotId)
            setIsLoaded(true)

            // Listen for ad events
            window.googletag.pubads().addEventListener("slotRenderEnded", (event: any) => {
              if (event.slot === newSlot) {
                if (event.isEmpty) {
                  console.warn(`Ad slot ${slotId} is empty`)
                  setHasError(true)
                } else {
                  setIsLoaded(true)
                  setHasError(false)
                }
              }
            })
          } else {
            setHasError(true)
          }
        } catch (error) {
          console.error("Error initializing ad slot:", error)
          setHasError(true)
        }
      })
    }

    initializeAd()

    return () => {
      if (slot && window.googletag) {
        window.googletag.cmd.push(() => {
          window.googletag.destroySlots([slot])
        })
        unregisterAdSlot(slotId)
      }
    }
  }, [inView, isGPTLoaded, adUnit, width, height, slotId, responsiveSizes, targeting])

  const combinedRef = (element: HTMLDivElement | null) => {
    adRef.current = element
    ref(element)
  }

  if (hasError) {
    return null // Collapse the space if ad fails
  }

  return (
    <div
      ref={combinedRef}
      className={`ad-component mx-auto ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {inView && (
        <div
          id={slotId}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            display: isLoaded ? "block" : "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: !isLoaded ? "#f0f0f0" : "transparent",
          }}
        >
          {!isLoaded && <span className="text-sm text-gray-400">Loading ad...</span>}
        </div>
      )}
    </div>
  )
}
