import type { HeaderCategory } from "@/components/HeaderClient"
import { HeaderInteractive } from "@/components/HeaderInteractive"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { getCategoriesForCountry } from "@/lib/wp-server/categories"
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

interface HeaderProps {
  countryCode?: string
  variant?: "desktop" | "mobile"
}

export async function Header({ countryCode, variant = "desktop" }: HeaderProps = {}) {
  const resolvedCountry = (countryCode ?? DEFAULT_COUNTRY).toLowerCase()
  const categories = await getCategoriesForCountry(resolvedCountry)
  const normalizedCategories = categories
    .map((category) => mapCategoryToHeaderCategory(category))
    .filter((category): category is HeaderCategory => Boolean(category))

  return (
    <HeaderInteractive
      categories={normalizedCategories}
      countryCode={resolvedCountry}
      variant={variant}
    />
  )
}

export { sortCategoriesByPreference } from "./header-utils"
