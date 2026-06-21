import type { HeaderCategory } from "@/components/HeaderClient"
import { HeaderInteractive } from "@/components/HeaderInteractive"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { getNavigationItemsForCountry } from "@/lib/wordpress/navigation"
import type { WordPressNavigationItem } from "@/lib/wordpress/navigation"

function mapNavigationItemToHeaderCategory(item: WordPressNavigationItem): HeaderCategory | null {
  const slug = item?.slug?.trim()
  const name = item?.name?.trim()

  if (!slug || !name) {
    return null
  }

  return {
    id: item.id ?? item.databaseId ?? 0,
    name,
    slug,
    href: item.href,
    description: item.description ?? undefined,
    count: item.count ?? undefined,
  }
}

interface HeaderProps {
  countryCode?: string
}

export async function Header({ countryCode }: HeaderProps = {}) {
  const resolvedCountry = (countryCode ?? DEFAULT_COUNTRY).toLowerCase()
  const navigationItems = await getNavigationItemsForCountry(resolvedCountry)
  const normalizedCategories = navigationItems
    .map((item: WordPressNavigationItem) => mapNavigationItemToHeaderCategory(item))
    .filter((category: HeaderCategory | null): category is HeaderCategory => Boolean(category))

  return <HeaderInteractive categories={normalizedCategories} countryCode={resolvedCountry} />
}

export { sortCategoriesByPreference } from "./header-utils"
