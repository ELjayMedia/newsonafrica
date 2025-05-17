"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface SkeletonContextType {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  // Minimum display time to prevent flickering
  minDisplayTime?: number
}

const SkeletonContext = createContext<SkeletonContextType | undefined>(undefined)

export function SkeletonProvider({
  children,
  initialLoading = true,
  minDisplayTime = 750, // Default minimum display time in ms
}: {
  children: React.ReactNode
  initialLoading?: boolean
  minDisplayTime?: number
}) {
  const [isLoading, setIsLoadingState] = useState(initialLoading)
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(initialLoading ? Date.now() : null)

  const setIsLoading = (loading: boolean) => {
    if (loading) {
      setLoadingStartTime(Date.now())
      setIsLoadingState(true)
    } else if (loadingStartTime) {
      const elapsedTime = Date.now() - loadingStartTime
      if (elapsedTime < minDisplayTime) {
        // If minimum display time hasn't elapsed, delay hiding the skeleton
        setTimeout(() => {
          setIsLoadingState(false)
        }, minDisplayTime - elapsedTime)
      } else {
        setIsLoadingState(false)
      }
    } else {
      setIsLoadingState(false)
    }
  }

  return (
    <SkeletonContext.Provider value={{ isLoading, setIsLoading, minDisplayTime }}>{children}</SkeletonContext.Provider>
  )
}

export function useSkeleton() {
  const context = useContext(SkeletonContext)
  if (context === undefined) {
    throw new Error("useSkeleton must be used within a SkeletonProvider")
  }
  return context
}
