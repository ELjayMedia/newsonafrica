import type { HeaderCategory } from "@/components/HeaderClient"
import { HeaderInteractive } from "@/components/HeaderInteractive"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { getCategoriesForCountry } from "@/lib/wordpress/service"
import { EDITORIAL_VERTICALS } from "@/config/verticals"
import type { WordPressCategory } from "@/types/wp"

function mapCategoryToHeaderCategory(category: WordPressCategory): HeaderCategory | null {
  const slug = category?.slug?.trim()
  const name = category?.name?.trim()

  if (!slug || !name) {
    return null
  }

  return {
    id: category.id ?? category.databaseId ?? 0,
    name,
    slug,
    description: category.description ?? undefined,
    count: category.count ?? undefined,
  }
}

/**
 * Build the canonical six editorial verticals as HeaderCategory entries.
 * These are used as the primary navigation items per the NOA-60 IA spec.
 * WordPress categories are merged in afterwards — verticals that exist in
 * WordPress get their id/count enriched; verticals missing from WordPress
 * still appear (with id=0) so the navigation is always complete.
 */
function buildVerticalCategories(wpCategories: HeaderCategory[]): HeaderCategory[] {
  const wpBySlug = new Map(wpCategories.map((c) => [c.slug.toLowerCase(), c]))

  return EDITORIAL_VERTICALS.map((vertical, index) => {
    const wp = wpBySlug.get(vertical.slug)
    return {
      id: wp?.id ?? index * -1 - 1, // negative synthetic id so it never collides with WP ids
      name: vertical.name,
      slug: vertical.slug,
      description: wp?.description ?? vertical.description,
      count: wp?.count,
    }
  })
}

interface HeaderProps {
  countryCode?: string
}

export async function Header({ countryCode }: HeaderProps = {}) {
  const resolvedCountry = (countryCode ?? DEFAULT_COUNTRY).toLowerCase()
  const categories = await getCategoriesForCountry(resolvedCountry)
  const wpCategories = categories
    .map((category: WordPressCategory) => mapCategoryToHeaderCategory(category))
    .filter((category: HeaderCategory | null): category is HeaderCategory => Boolean(category))

  // Verticals are always the first six nav items in canonical order (NOA-60).
  // Any additional WP categories that are not verticals are appended after.
  const verticalSlugs = new Set(EDITORIAL_VERTICALS.map((v) => v.slug))
  const verticalCategories = buildVerticalCategories(wpCategories)
  const nonVerticalCategories = wpCategories.filter((c) => !verticalSlugs.has(c.slug.toLowerCase()))
  const normalizedCategories = [...verticalCategories, ...nonVerticalCategories]

  return <HeaderInteractive categories={normalizedCategories} countryCode={resolvedCountry} />
}

export { sortCategoriesByPreference } from "./header-utils"
