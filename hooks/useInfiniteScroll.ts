import logger from "@/utils/logger";
"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  disabled?: boolean
}

export function useInfiniteScroll(callback: () => Promise<void> | void, options: UseInfiniteScrollOptions = {}) {
  const { threshold = 0.1, rootMargin = "100px 0px", disabled = false } = options
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const observer = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && !isFetching && !disabled) {
        setIsFetching(true)
      }
    },
    [isFetching, disabled],
  )

  useEffect(() => {
    // Disconnect previous observer if it exists
    if (observer.current) {
      observer.current.disconnect()
    }

    // Create new observer
    observer.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold,
    })

    // Observe the load more element if it exists
    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [handleObserver, rootMargin, threshold])

  useEffect(() => {
    async function fetchData() {
      if (!isFetching) return

      setError(null)
      try {
        await callback()
      } catch (err) {
        logger.error("Error in infinite scroll:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsFetching(false)
      }
    }

    fetchData()
  }, [isFetching, callback])

  const manualFetch = useCallback(() => {
    if (!isFetching && !disabled) {
      setIsFetching(true)
    }
  }, [isFetching, disabled])

  return {
    isFetching,
    setIsFetching,
    loadMoreRef,
    error,
    manualFetch,
  }
}
