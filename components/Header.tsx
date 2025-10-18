"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

import { HeaderClient, type HeaderCategory } from "@/components/HeaderClient"
import { useCategories } from "@/lib/hooks/useWordPressData"
import { DEFAULT_COUNTRY, getCurrentCountry } from "@/lib/utils/routing"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"

function normalizeCountry(value?: string | null) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : undefined
}

function resolveCountry(pathname: string | null, provided?: string): string {
  const normalizedProvided = normalizeCountry(provided)
  if (normalizedProvided) {
    return normalizedProvided
  }

  const detected = getCurrentCountry(pathname ?? undefined)
  return normalizeCountry(detected) ?? DEFAULT_COUNTRY
}

export function sortCategoriesByPreference(
  categories: HeaderCategory[],
  sections: string[],
): HeaderCategory[] {
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

interface HeaderProps {
  countryCode?: string
}

export function Header({ countryCode }: HeaderProps = {}) {
  const pathname = usePathname()
  const effectiveCountry = useMemo(() => resolveCountry(pathname, countryCode), [pathname, countryCode])

  const { categories } = useCategories(effectiveCountry)
  const { preferences } = useUserPreferences()

  const sortedCategories = useMemo(
    () => sortCategoriesByPreference(categories ?? [], preferences?.sections ?? []),
    [categories, preferences?.sections],
  )

  return <HeaderClient categories={sortedCategories} countryCode={effectiveCountry} />
}
