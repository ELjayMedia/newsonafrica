"use client"

import { useState, useEffect, useCallback, useRef, type SetStateAction } from "react"

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
  const isFetchingRef = useRef(isFetching)
  const handleObserverRef = useRef<IntersectionObserverCallback>(() => {})

  const setFetchingState = useCallback((value: SetStateAction<boolean>) => {
    setIsFetching(prev => {
      const next = typeof value === "function" ? value(prev) : value
      isFetchingRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    isFetchingRef.current = isFetching
  }, [isFetching])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && !isFetchingRef.current && !disabled) {
        setFetchingState(true)
      }
    },
    [disabled, setFetchingState],
  )

  useEffect(() => {
    handleObserverRef.current = handleObserver
  }, [handleObserver])

  useEffect(() => {
    // Disconnect previous observer if it exists
    if (observer.current) {
      observer.current.disconnect()
    }

    if (disabled) {
      return
    }

    // Create new observer
    observer.current = new IntersectionObserver((entries, obs) => handleObserverRef.current(entries, obs), {
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
  }, [threshold, rootMargin, disabled])

  useEffect(() => {
    async function fetchData() {
      if (!isFetching) return

      setError(null)
      try {
        await callback()
      } catch (err) {
        console.error("Error in infinite scroll:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setFetchingState(false)
      }
    }

    fetchData()
  }, [isFetching, callback, setFetchingState])

  const manualFetch = useCallback(() => {
    if (!isFetchingRef.current && !disabled) {
      setFetchingState(true)
    }
  }, [disabled, setFetchingState])

  return {
    isFetching,
    setIsFetching: setFetchingState,
    loadMoreRef,
    error,
    manualFetch,
  }
}
