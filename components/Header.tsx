import { headers } from "next/headers"

import { HeaderClient, type HeaderCategory } from "@/components/HeaderClient"
import { getServerUserPreferredSections } from "@/lib/supabase/server-user-preferences"
import { getServerCountry, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { getCategoriesForCountry } from "@/lib/wordpress-api"

function extractCountryFromPath(path: string | null): string | null {
  if (!path) return null

  try {
    const url = path.startsWith("http") ? new URL(path).pathname : path
    const segments = url.split("/").filter(Boolean)
    if (segments.length === 0) {
      return null
    }

    const candidate = segments[0]?.toLowerCase()
    if (candidate && SUPPORTED_COUNTRIES.includes(candidate)) {
      return candidate
    }
  } catch {
    return null
  }

  return null
}

export function sortCategoriesByPreference(categories: HeaderCategory[], sections: string[]): HeaderCategory[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return []
  }

  const normalizedSections = (sections ?? []).map((section) => section.toLowerCase())
  if (normalizedSections.length === 0) {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name))
  }

  const sectionOrder = new Map<string, number>()
  normalizedSections.forEach((section, index) => {
    if (!sectionOrder.has(section)) {
      sectionOrder.set(section, index)
    }
  })

  return [...categories].sort((a, b) => {
    const aKey = a.slug.toLowerCase()
    const bKey = b.slug.toLowerCase()
    const aOrder = sectionOrder.get(aKey)
    const bOrder = sectionOrder.get(bKey)

    if (aOrder === undefined && bOrder === undefined) {
      return a.name.localeCompare(b.name)
    }

    if (aOrder === undefined) {
      return 1
    }

    if (bOrder === undefined) {
      return -1
    }

    if (aOrder !== bOrder) {
      return aOrder - bOrder
    }

    return a.name.localeCompare(b.name)
  })
}

function resolveCountryFromHeaders(): string {
  const headerList = headers()

  const candidates = [
    headerList.get("x-invoke-path"),
    headerList.get("x-invoke-query"),
    headerList.get("x-matched-path"),
    headerList.get("x-original-uri"),
    headerList.get("x-rewrite-url"),
    headerList.get("x-request-url"),
    headerList.get("referer"),
  ]

  for (const candidate of candidates) {
    const country = extractCountryFromPath(candidate)
    if (country) {
      return country
    }
  }

  return getServerCountry()
}

export async function Header() {
  const countryCode = resolveCountryFromHeaders()
  const [categories, preferredSections] = await Promise.all([
    getCategoriesForCountry(countryCode),
    getServerUserPreferredSections(),
  ])

  const sortedCategories = sortCategoriesByPreference(categories ?? [], preferredSections ?? [])

  return <HeaderClient categories={sortedCategories} countryCode={countryCode} />
}
