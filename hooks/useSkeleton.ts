"use client"

import { useState, useEffect } from "react"

interface UseSkeletonOptions {
  initialLoading?: boolean
  minDisplayTime?: number
}

export function useSkeletonLoader({ initialLoading = true, minDisplayTime = 750 }: UseSkeletonOptions = {}) {
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(initialLoading ? Date.now() : null)

  // Function to set loading state with minimum display time
  const setLoading = (loading: boolean) => {
    if (loading && !isLoading) {
      setLoadingStartTime(Date.now())
      setIsLoading(true)
    } else if (!loading && isLoading && loadingStartTime) {
      const elapsedTime = Date.now() - loadingStartTime
      if (elapsedTime < minDisplayTime) {
        // If minimum display time hasn't elapsed, delay hiding the skeleton
        setTimeout(() => {
          setIsLoading(false)
        }, minDisplayTime - elapsedTime)
      } else {
        setIsLoading(false)
      }
    }
  }

  // Automatically start loading when component mounts
  useEffect(() => {
    if (initialLoading) {
      setLoadingStartTime(Date.now())
    }
  }, [initialLoading])

  return { isLoading, setLoading }
}
