import type { HeaderCategory } from "@/components/HeaderClient"

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
