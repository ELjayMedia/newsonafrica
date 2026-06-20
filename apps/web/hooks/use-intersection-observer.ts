"use client"

import * as React from "react"

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  disabled?: boolean
}

export function useIntersectionObserver<T extends Element>(options: UseIntersectionObserverOptions = {}) {
  const { disabled = false, root, rootMargin, threshold } = options
  const [isIntersecting, setIntersecting] = React.useState(false)
  const observerRef = React.useRef<IntersectionObserver | null>(null)

  const callbackRef = React.useCallback(
    (node: T | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null

      if (!node || disabled) {
        setIntersecting(false)
        return
      }

      if (typeof IntersectionObserver === "undefined") {
        setIntersecting(true)
        return
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          setIntersecting(entry?.isIntersecting ?? false)
        },
        { root, rootMargin, threshold },
      )

      observerRef.current.observe(node)
    },
    [disabled, root, rootMargin, threshold],
  )

  React.useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return { ref: callbackRef, inView: isIntersecting }
}
