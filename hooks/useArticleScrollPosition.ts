"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

export function useArticleScrollPosition(articleId: string) {
  const storageKey = useMemo(() => `article-scroll:${articleId}`, [articleId])

  const [scrollPosition, setScrollPosition] = useState(0)
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const raw = window.sessionStorage.getItem(storageKey)
    const parsed = raw ? Number(raw) : 0

    setScrollPosition(Number.isFinite(parsed) ? parsed : 0)
  }, [storageKey])

  const saveScrollPosition = useCallback(
    (position?: number) => {
      if (typeof window === "undefined") return

      const pos =
        typeof position === "number" && Number.isFinite(position)
          ? position
          : window.scrollY

      window.sessionStorage.setItem(storageKey, String(pos))
      setScrollPosition(pos)
    },
    [storageKey],
  )

  const restoreScrollPosition = useCallback(() => {
    if (typeof window === "undefined") return

    window.scrollTo({
      top: scrollPosition,
      behavior: "auto",
    })
    setHasRestoredPosition(true)
  }, [scrollPosition])

  const clearScrollPosition = useCallback(() => {
    if (typeof window === "undefined") return

    window.sessionStorage.removeItem(storageKey)
    setScrollPosition(0)
    setHasRestoredPosition(false)
  }, [storageKey])

  return {
    scrollPosition,
    hasRestoredPosition,
    restoreScrollPosition,
    clearScrollPosition,
    saveScrollPosition,
  }
}
