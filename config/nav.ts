import { unstable_cache } from "next/cache"
import { fetchAllCategories } from "@/lib/wordpress-api"

export interface NavItem {
  title: string
  href: string
  count?: number
}

export const getNavItems = unstable_cache(async (): Promise<NavItem[]> => {
  const categories = await fetchAllCategories()
  return categories.map((category: { name: string; slug: string; count?: number }) => ({
    title: category.name,
    href: `/category/${category.slug}`,
    count: category.count,
  }))
}, ["nav-items"], { revalidate: 3600 })

export type { NavItem }
