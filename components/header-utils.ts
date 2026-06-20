import type { HeaderCategory } from "@/components/HeaderClient"
import { VERTICAL_SLUGS } from "@/config/verticals"

/**
 * Sort categories so that editorial verticals (NOA-60) always appear first,
 * in the canonical vertical order defined in config/verticals.ts.
 *
 * When the user has saved section preferences those are respected *within*
 * the vertical group — a preferred vertical is still a vertical, just
 * promoted to the front of that group.  Non-vertical categories follow
 * alphabetically.
 */
export function sortCategoriesByPreference(
  categories: HeaderCategory[],
  sections: string[],
): HeaderCategory[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return []
  }

  // Build a canonical order map: verticals first (by VERTICAL_SLUGS index),
  // then user-preferred sections, then everything else.
  const verticalIndex = new Map<string, number>(VERTICAL_SLUGS.map((slug, i) => [slug, i]))

  const normalizedSections = (sections ?? []).map((section) => section.toLowerCase())

  // User-preference index starts after verticals so it only kicks in for
  // non-vertical items (vertical ordering always wins for vertical slugs).
  const prefOffset = VERTICAL_SLUGS.length
  const preferenceIndex = new Map<string, number>()
  normalizedSections.forEach((section, index) => {
    if (!preferenceIndex.has(section)) {
      preferenceIndex.set(section, prefOffset + index)
    }
  })

  return [...categories].sort((a, b) => {
    const aSlug = a.slug.toLowerCase()
    const bSlug = b.slug.toLowerCase()

    const aVertical = verticalIndex.get(aSlug)
    const bVertical = verticalIndex.get(bSlug)

    // Both are verticals — sort by canonical vertical order
    if (aVertical !== undefined && bVertical !== undefined) {
      return aVertical - bVertical
    }

    // Only one is a vertical — it wins
    if (aVertical !== undefined) return -1
    if (bVertical !== undefined) return 1

    // Neither is a vertical — fall back to user preference then alpha
    const aPref = preferenceIndex.get(aSlug)
    const bPref = preferenceIndex.get(bSlug)

    if (aPref !== undefined && bPref !== undefined) return aPref - bPref
    if (aPref !== undefined) return -1
    if (bPref !== undefined) return 1

    return a.name.localeCompare(b.name)
  })
}
