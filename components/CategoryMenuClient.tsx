"use client"

import CategoryDropdownNav from "@/components/CategoryDropdownNav"
import { useNavigationRouting } from "@/hooks/useNavigationRouting"
import type { WordPressCategory } from "@/lib/api/wordpress"

interface CategoryMenuClientProps {
  categories: WordPressCategory[]
}

export default function CategoryMenuClient({ categories }: CategoryMenuClientProps) {
  const { currentCountry, activeSlug, navigateTo } = useNavigationRouting()

  return (
    <CategoryDropdownNav
      categories={categories}
      activeSlug={activeSlug || undefined}
      onNavigate={(slug) => navigateTo(slug, currentCountry)}
    />
  )
}

