/**
 * Utility functions for handling country-specific article routing
 * Converts from generic /post/ routes to /[country]/article/ routes
 */

// Default country mapping based on user preferences or URL structure
export const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

// Supported countries
export const SUPPORTED_COUNTRIES = ["sz", "za"]

/**
 * Get the current country code from various sources
 * Priority: URL path > user preference > default
 */
export function getCurrentCountry(pathname?: string): string {
  // Try to extract from current pathname
  if (pathname) {
    const pathSegments = pathname.split("/")
    const potentialCountry = pathSegments[1]
    if (SUPPORTED_COUNTRIES.includes(potentialCountry)) {
      return potentialCountry
    }
  }

  // Try to get from localStorage (user preference)
  if (typeof window !== "undefined") {
    const savedCountry = localStorage.getItem("preferredCountry")
    if (savedCountry && SUPPORTED_COUNTRIES.includes(savedCountry)) {
      return savedCountry
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
  if (isLegacyPostUrl(url)) {
    const slug = url.replace("/post/", "")
    return getArticleUrl(slug, countryCode)
  }
  return url
}
