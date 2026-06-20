"use client"

import { useEffect, useRef, useCallback } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { isLegacyPostUrl } from "@/lib/utils/routing"

export function ScrollToTop() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useUser()
  const prevPathRef = useRef<string | null>(null)
  const prevSearchParamsRef = useRef<URLSearchParams | null>(null)
  const isArticlePageRef = useRef<boolean>(false)

  // Check if current page is an article page
  const isArticlePage = isLegacyPostUrl(pathname || "") || pathname?.includes("/article/")

  // Function to handle scrolling to top
  const scrollToTop = useCallback(() => {
    // Skip scrolling on article pages for authenticated users
    // (ArticleView component handles this separately)
    if (isAuthenticated && isArticlePage) {
      return
    }

    // Try multiple methods for maximum browser compatibility
    try {
      // Modern browsers
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    } catch (error) {
      console.warn("Falling back to immediate scroll", error)
      // Fallback for older browsers
      window.scrollTo(0, 0)
    }
  }, [isAuthenticated, isArticlePage])

  // Effect for route changes
  useEffect(() => {
    const currentSearchParams = searchParams.toString()
    const prevSearchParamsString = prevSearchParamsRef.current?.toString() || ""

    // Update article page ref
    isArticlePageRef.current = isArticlePage

    // Only scroll if the path or search params have changed
    if (pathname !== prevPathRef.current || currentSearchParams !== prevSearchParamsString) {
      // Skip scrolling when navigating to article pages if authenticated
      // (ArticleView component handles this)
      if (!(isAuthenticated && isArticlePage)) {
        scrollToTop()
      }

      // Update refs
      prevPathRef.current = pathname
      prevSearchParamsRef.current = new URLSearchParams(currentSearchParams)
    }
  }, [pathname, searchParams, isAuthenticated, isArticlePage, scrollToTop])

  // Effect for initial load and auth state changes
  useEffect(() => {
    // Skip initial scroll on article pages for authenticated users
    if (!(isAuthenticated && isArticlePage)) {
      // Scroll to top on initial load
      scrollToTop()
    }

    // Listen for custom auth state change events
    const handleAuthStateChange = () => {
      if (!(isAuthenticated && isArticlePageRef.current)) {
        scrollToTop()
      }
    }

    // Listen for storage events (can indicate auth state changes)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "supabase.auth.token" || event.key === "auth") {
        if (!(isAuthenticated && isArticlePageRef.current)) {
          scrollToTop()
        }
      }
    }

    // Add event listeners
    window.addEventListener("auth-state-change", handleAuthStateChange)
    window.addEventListener("storage", handleStorageChange)

    // Clean up
    return () => {
      window.removeEventListener("auth-state-change", handleAuthStateChange)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [isAuthenticated, isArticlePage, scrollToTop])

  // Listen for history changes (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      // Skip scrolling on article pages for authenticated users
      if (!(isAuthenticated && isArticlePageRef.current)) {
        scrollToTop()
      }
    }

    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [isAuthenticated, scrollToTop])

  return null
}
