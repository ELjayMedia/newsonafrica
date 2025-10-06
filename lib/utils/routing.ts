/**
 * Utility functions for handling country-specific article routing
 * Converts from generic /post/ routes to /[country]/article/ routes
 */

import { SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS } from "@/lib/editions"

// Default country mapping based on user preferences or URL structure
export const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

// Supported countries
export const SUPPORTED_COUNTRIES = SUPPORTED_COUNTRY_EDITIONS.map((country) => country.code)

/**
 * Get the current country code from various sources
 * Priority: URL path > user preference > default
 */
export function getCurrentCountry(pathname?: string): string {
  const normalizeCountry = (value?: string | null) =>
    value?.toLowerCase() ?? undefined

  const matchSupportedCountry = (value?: string | null) => {
    const normalized = normalizeCountry(value)
    return normalized && SUPPORTED_COUNTRIES.includes(normalized) ? normalized : undefined
  }

  const extractFromPath = (path?: string | null) => {
    if (!path) return undefined
    const pathSegments = path.split("/").filter(Boolean)
    if (!pathSegments.length) return undefined
    return matchSupportedCountry(pathSegments[0])
  }

  // Try to extract from provided pathname first
  const fromProvidedPath = extractFromPath(pathname)
  if (fromProvidedPath) {
    return fromProvidedPath
  }

  if (typeof window !== "undefined") {
    // Inspect the current browser location when available
    const fromWindowPath = extractFromPath(window.location?.pathname)
    if (fromWindowPath) {
      return fromWindowPath
    }

    // Read preferred country from cookies if present
    const preferredCookie = window.document?.cookie
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("preferredCountry="))
    const cookieCountry = preferredCookie?.split("=")?.[1]
    const fromCookie = matchSupportedCountry(cookieCountry && decodeURIComponent(cookieCountry))
    if (fromCookie) {
      return fromCookie
    }

    // Try to get from localStorage (user preference)
    try {
      const savedCountry = window.localStorage?.getItem("preferredCountry")
      const fromStorage = matchSupportedCountry(savedCountry)
      if (fromStorage) {
        return fromStorage
      }
    } catch {
      // Access to localStorage can throw in some environments; ignore and continue
    }
  }

  return DEFAULT_COUNTRY
}

// Server-side helper to read country from cookies
export function getServerCountry(): string {
  try {
    // Dynamically import to avoid bundling on client
    const { cookies } = require("next/headers") as typeof import("next/headers")
    const store = cookies() as any
    const saved = store.get("preferredCountry")?.value
    if (saved && SUPPORTED_COUNTRIES.includes(saved)) {
      return saved
    }
  } catch {
    // noop - fallback to default
  }
  return DEFAULT_COUNTRY
}

/**
 * Generate country-specific article URL
 */
export function getArticleUrl(slug: string, countryCode?: string): string {
  const country = countryCode || getCurrentCountry()
  return `/${country}/article/${slug}`
}

/**
 * Generate country-specific category URL
 */
export function getCategoryUrl(slug: string, countryCode?: string): string {
  const country = countryCode || getCurrentCountry()
  return `/${country}/category/${slug}`
}

/**
 * Check if a URL is using the old /post/ format
 */
export function isLegacyPostUrl(url: string): boolean {
  return url.startsWith("/post/")
}

/**
 * Convert legacy /post/ URL to country-specific format
 */
export function convertLegacyUrl(url: string, countryCode?: string): string {
  // Handle absolute URLs by parsing and preserving origin/search/hash
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      if (isLegacyPostUrl(parsed.pathname)) {
        const slug = parsed.pathname.replace("/post/", "")
        const newPath = getArticleUrl(slug, countryCode)
        return `${parsed.origin}${newPath}${parsed.search}${parsed.hash}`
      }
      return url
    } catch {
      return url
    }
  }

  // Relative URL handling
  const [path, rest = ""] = url.split(/(?=[?#])/)
  if (isLegacyPostUrl(path)) {
    const slug = path.replace("/post/", "")
    return getArticleUrl(slug, countryCode) + rest
  }
  return url
}

/**
 * Rewrite legacy post links within HTML content
 * Converts both relative and absolute /post/{slug} URLs
 * to the country-aware article format
 */
export function rewriteLegacyLinks(html: string, countryCode?: string): string {
  if (!html) return html
  const country = countryCode || getCurrentCountry()
  const regex = /href=(['"])(?:https?:\/\/[^'" ]+)?\/post\/([^'"?#]+)([^'"]*)\1/g
  return html.replace(regex, (_match, quote, slug, rest) => {
    return `href=${quote}${getArticleUrl(slug, country)}${rest}${quote}`
  })
}
