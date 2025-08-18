import logger from "@/utils/logger";
"use client"

import { useEffect, useState } from "react"

declare global {
  interface Window {
    googletag: {
      cmd: Array<() => void>
      defineSlot: (adUnitPath: string, size: number[] | number[][], divId: string) => any
      display: (divId: string) => void
      pubads: () => {
        enableSingleRequest: () => void
        collapseEmptyDivs: () => void
        enableLazyLoad: (config: any) => void
        refresh: (slots?: any[]) => void
        addEventListener: (event: string, callback: (event: any) => void) => void
      }
      enableServices: () => void
      destroySlots: (slots?: any[]) => boolean
    }
  }
}

interface UseGoogleAdsProps {
  adUnit: string
  width: number
  height: number
  slotId: string
  responsiveSizes?: number[][]
}

export function useGoogleAds({ adUnit, width, height, slotId, responsiveSizes }: UseGoogleAdsProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [slot, setSlot] = useState<any>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    let timeoutId: NodeJS.Timeout

    const initializeAd = () => {
      try {
        if (!window.googletag) {
          logger.warn("Google Ad Manager not loaded")
          setHasError(true)
          return
        }

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
              setSlot(newSlot)

              // Display the ad
              window.googletag.display(slotId)
              setIsLoaded(true)

              // Listen for ad events
              window.googletag.pubads().addEventListener("slotRenderEnded", (event: any) => {
                if (event.slot === newSlot) {
                  if (event.isEmpty) {
                    logger.warn(`Ad slot ${slotId} is empty`)
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
            logger.error("Error initializing ad slot:", error)
            setHasError(true)
          }
        })

        // Set a timeout to detect if ad fails to load
        timeoutId = setTimeout(() => {
          if (!isLoaded) {
            logger.warn(`Ad slot ${slotId} failed to load within timeout`)
            setHasError(true)
          }
        }, 10000) // 10 second timeout
      } catch (error) {
        logger.error("Error in ad initialization:", error)
        setHasError(true)
      }
    }

    // Initialize ad after a short delay to ensure DOM is ready
    const initTimeout = setTimeout(initializeAd, 100)

    return () => {
      clearTimeout(initTimeout)
      clearTimeout(timeoutId)

      // Cleanup slot on unmount
      if (slot && window.googletag) {
        window.googletag.cmd.push(() => {
          window.googletag.destroySlots([slot])
        })
      }
    }
  }, [adUnit, width, height, slotId, responsiveSizes])

  const refreshAd = () => {
    if (slot && window.googletag) {
      window.googletag.cmd.push(() => {
        window.googletag.pubads().refresh([slot])
      })
    }
  }

  return {
    isLoaded,
    hasError,
    refreshAd,
  }
}
