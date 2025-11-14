"use client"

import { useMemo } from "react"

import { HeaderClient, type HeaderCategory } from "@/components/HeaderClient"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"

import { sortCategoriesByPreference } from "./header-utils"

interface HeaderInteractiveProps {
  categories: HeaderCategory[]
  countryCode: string
  variant?: "desktop" | "mobile"
}

export function HeaderInteractive({ categories, countryCode, variant }: HeaderInteractiveProps) {
  const { preferences } = useUserPreferences()

  const sortedCategories = useMemo(
    () => sortCategoriesByPreference(categories ?? [], preferences?.sections ?? []),
    [categories, preferences?.sections],
  )

  return <HeaderClient categories={sortedCategories} countryCode={countryCode} variant={variant} />
}
