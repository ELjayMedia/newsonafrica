"use client"

import { useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"
import { useNavigationState } from "@/contexts/NavigationContext"

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
  const { activeSlug: contextSlug } = useNavigationState()

  let currentCountry = DEFAULT_COUNTRY
  let activeSlug: string | null = contextSlug

  if (pathname) {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length >= 1) {
      if (segments[0].length === 2) {
        currentCountry = segments[0]
      }

      if (!activeSlug) {
        if (segments.length >= 3 && segments[1] === "category") {
          activeSlug = segments[2]
        } else if (segments.length >= 2 && segments[0] === "category") {
          activeSlug = segments[1]
        }
      }
    }
  }

  const getCategoryPath = useCallback(
    (slug: string, countryCode: string = currentCountry) =>
      `/${countryCode}/category/${slug}`,
    [currentCountry],
  )

  const navigateTo = useCallback(
    (slug?: string, countryCode: string = currentCountry) => {
      const path = slug ? getCategoryPath(slug, countryCode) : `/${countryCode}`
      router.push(path)
    },
    [router, currentCountry, getCategoryPath],
  )

  return { currentCountry, activeSlug, navigateTo, getCategoryPath }
}
