"use client"

import { useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"

// Fallback country code if none is present in the URL
const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

/**
 * Parse the current pathname and return the active country and slug.
 * navigateTo() can be used to push a new country/slug combination.
 *
 * Example:
 * ```ts
 * const { navigateTo } = useNavigationRouting()
 * // Selecting Eswatini (code "sz") will push "/sz" (or "/sz/category/{slug}")
 * // and API hooks using `currentCountry` will request data for that edition.
 * ```
 */
export function useNavigationRouting() {
  const router = useRouter()
  const pathname = usePathname()

  let currentCountry = DEFAULT_COUNTRY
  let activeSlug: string | null = null

  if (pathname) {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length >= 3 && segments[1] === "category") {
      // /{country}/category/{slug}
      currentCountry = segments[0]
      activeSlug = segments[2]
    } else if (segments.length >= 2 && segments[0] === "category") {
      // /category/{slug}
      activeSlug = segments[1]
    }
  }

  const navigateTo = useCallback(
    (slug?: string, countryCode: string = currentCountry) => {
      const path = slug
        ? `/${countryCode}/category/${slug}`
        : `/${countryCode}`
      router.push(path)
    },
    [router, currentCountry],
  )

  return { currentCountry, activeSlug, navigateTo }
}
