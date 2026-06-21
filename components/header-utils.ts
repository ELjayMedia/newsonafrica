import type { HeaderCategory } from "@/components/HeaderClient"

/**
 * Reorder WordPress-provided categories by the reader's saved section
 * preferences without introducing frontend-owned navigation labels.
 *
 * Categories that are not preferred keep their WordPress-provided order.
 */
export function sortCategoriesByPreference(
  categories: HeaderCategory[],
  sections: string[],
): HeaderCategory[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return []
  }

  const preferenceIndex = new Map<string, number>()
  ;(sections ?? []).forEach((section, index) => {
    const normalizedSection = section.toLowerCase()
    if (!preferenceIndex.has(normalizedSection)) {
      preferenceIndex.set(normalizedSection, index)
    }
  })

  if (preferenceIndex.size === 0) {
    return [...categories]
  }

  return [...categories]
    .map((category, originalIndex) => ({ category, originalIndex }))
    .sort((a, b) => {
      const aPref = preferenceIndex.get(a.category.slug.toLowerCase())
      const bPref = preferenceIndex.get(b.category.slug.toLowerCase())

      if (aPref !== undefined && bPref !== undefined) return aPref - bPref
      if (aPref !== undefined) return -1
      if (bPref !== undefined) return 1

      return a.originalIndex - b.originalIndex
    })
    .map(({ category }) => category)
}
