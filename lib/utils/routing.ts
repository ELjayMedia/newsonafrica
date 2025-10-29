/**
 * Utility functions for handling country-specific article routing
 * Converts from generic /post/ routes to /[country]/article/ routes
 */

import {
  SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS,
  SUPPORTED_EDITIONS as SUPPORTED_EDITION_DEFINITIONS,
} from "@/lib/editions"
import { DEFAULT_SITE_COUNTRY } from "@/lib/constants/country"

const normalizeCountry = (value?: string | null) => value?.toLowerCase() ?? undefined

const FALLBACK_COUNTRY = "sz"

// Default country mapping based on user preferences or URL structure
export const DEFAULT_COUNTRY =
  normalizeCountry(DEFAULT_SITE_COUNTRY) ?? FALLBACK_COUNTRY

// Supported countries
export const SUPPORTED_COUNTRIES = SUPPORTED_COUNTRY_EDITIONS.map((country) => country.code)

const SUPPORTED_EDITION_CODES = new Set(
  SUPPORTED_EDITION_DEFINITIONS.map((edition) => edition.code),
)

const matchSupportedEdition = (value?: string | null) => {
  const normalized = normalizeCountry(value)
  return normalized && SUPPORTED_EDITION_CODES.has(normalized)
    ? normalized
    : undefined
}

const COOKIE_PREFERENCE_KEYS = ["country", "preferredCountry"] as const

const readCookiePreference = (cookiesString?: string | null) => {
  if (!cookiesString) return undefined

  for (const key of COOKIE_PREFERENCE_KEYS) {
    const prefix = `${key}=`
    const match = cookiesString
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(prefix))

    if (match) {
      const value = match.slice(prefix.length)
      if (value) {
        return decodeURIComponent(value)
      }
    }
  }

  return undefined
}

/**
 * Get the current country code from various sources
 * Priority: URL path > user preference > default
 */
export function getCurrentCountry(pathname?: string): string {
  const extractFromPath = (path?: string | null) => {
    if (!path) return undefined
    const pathSegments = path.split("/").filter(Boolean)
    if (!pathSegments.length) return undefined
    return matchSupportedEdition(pathSegments[0])
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
    const cookieCountry = readCookiePreference(window.document?.cookie)
    const fromCookie = matchSupportedEdition(cookieCountry)
    if (fromCookie) {
      return fromCookie
    }

    // Try to get from localStorage (user preference)
    try {
      const savedCountry = window.localStorage?.getItem("preferredCountry")
      const fromStorage = matchSupportedEdition(savedCountry)
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
    const raw = store.get("country")?.value ?? store.get("preferredCountry")?.value
    const saved = matchSupportedEdition(raw)
    if (saved) {
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
 * Determine the appropriate home link for the current pathname.
 * Returns the matched country edition path when available, otherwise falls back to the root.
 */
export function getHomeHref(pathname?: string | null): string {
  if (pathname) {
    const [firstSegment] = pathname.split("/").filter(Boolean)
    const normalized = firstSegment?.toLowerCase()
    if (normalized && SUPPORTED_COUNTRIES.includes(normalized)) {
      return `/${normalized}`
    }
  }

  return "/"
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
