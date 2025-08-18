import logger from "@/utils/logger";
"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { checkAdBlocker } from "@/lib/ad-utils"

interface AdManagerContextType {
  isAdBlockerDetected: boolean
  isGPTLoaded: boolean
  refreshAllAds: () => void
  refreshAdsForRoute: (route: string) => void
  registerAdSlot: (slotId: string) => void
  unregisterAdSlot: (slotId: string) => void
  getActiveSlots: () => string[]
}

const AdManagerContext = createContext<AdManagerContextType | undefined>(undefined)

export function useAdManager() {
  const context = useContext(AdManagerContext)
  if (!context) {
    throw new Error("useAdManager must be used within an AdManagerProvider")
  }
  return context
}

interface AdManagerProviderProps {
  children: React.ReactNode
}

export function AdManagerProvider({ children }: AdManagerProviderProps) {
  const [isAdBlockerDetected, setIsAdBlockerDetected] = useState(false)
  const [isGPTLoaded, setIsGPTLoaded] = useState(false)
  const activeSlots = useRef<Set<string>>(new Set())
  const lastRefreshTime = useRef<number>(0)
  const refreshCooldown = 1000 // 1 second cooldown between refreshes

  useEffect(() => {
    // Check for ad blocker
    checkAdBlocker().then(setIsAdBlockerDetected)

    // Check if GPT is loaded
    const checkGPTLoaded = () => {
      if (typeof window !== "undefined" && window.googletag) {
        setIsGPTLoaded(true)

        // Set up GPT event listeners
        window.googletag.cmd.push(() => {
          window.googletag.pubads().addEventListener("slotOnload", (event) => {
            logger.info("📺 Ad loaded:", event.slot.getSlotElementId())
          })

          window.googletag.pubads().addEventListener("slotRenderEnded", (event) => {
            logger.info("🎨 Ad rendered:", event.slot.getSlotElementId(), "Empty:", event.isEmpty)
          })
        })
      } else {
        setTimeout(checkGPTLoaded, 100)
      }
    }
    checkGPTLoaded()
  }, [])

  const registerAdSlot = (slotId: string) => {
    activeSlots.current.add(slotId)
    logger.info("📝 Registered ad slot:", slotId)
  }

  const unregisterAdSlot = (slotId: string) => {
    activeSlots.current.delete(slotId)
    logger.info("🗑️ Unregistered ad slot:", slotId)
  }

  const getActiveSlots = () => {
    return Array.from(activeSlots.current)
  }

  const refreshAllAds = () => {
    const now = Date.now()

    // Prevent too frequent refreshes
    if (now - lastRefreshTime.current < refreshCooldown) {
      logger.info("⏳ Ad refresh skipped - too frequent")
      return
    }

    if (typeof window !== "undefined" && window.googletag) {
      logger.info("🔄 Refreshing all ads, active slots:", getActiveSlots())

      window.googletag.cmd.push(() => {
        // Only refresh if we have active slots
        if (activeSlots.current.size > 0) {
          window.googletag.pubads().refresh()
          lastRefreshTime.current = now
        }
      })
    }
  }

  const refreshAdsForRoute = (route: string) => {
    const now = Date.now()

    // Prevent too frequent refreshes
    if (now - lastRefreshTime.current < refreshCooldown) {
      logger.info("⏳ Route-based ad refresh skipped - too frequent")
      return
    }

    if (typeof window !== "undefined" && window.googletag) {
      logger.info("🛣️ Refreshing ads for route:", route, "Active slots:", getActiveSlots())

      window.googletag.cmd.push(() => {
        if (activeSlots.current.size > 0) {
          // Clear targeting for route-specific ads
          window.googletag.pubads().clearTargeting("page_url")
          window.googletag.pubads().setTargeting("page_url", route)

          // Refresh ads with new targeting
          window.googletag.pubads().refresh()
          lastRefreshTime.current = now

          logger.info("✅ Ads refreshed for route:", route)
        }
      })
    }
  }

  return (
    <AdManagerContext.Provider
      value={{
        isAdBlockerDetected,
        isGPTLoaded,
        refreshAllAds,
        refreshAdsForRoute,
        registerAdSlot,
        unregisterAdSlot,
        getActiveSlots,
      }}
    >
      {children}
    </AdManagerContext.Provider>
  )
}
