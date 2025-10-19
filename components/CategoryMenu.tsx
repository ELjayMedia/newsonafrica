import { cache, Suspense } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchAllCategories } from "@/lib/wordpress-api"
import { getCategoryUrl } from "@/lib/utils/routing"
import { DEFAULT_COUNTRY } from "@/lib/wordpress/shared"
import type { WordPressCategory } from "@/types/wp"

type CategorySummary = Required<Pick<WordPressCategory, "name" | "slug">> &
  Pick<WordPressCategory, "id" | "count">

const loadCategories = cache(async (countryCode?: string): Promise<CategorySummary[]> => {
  try {
    const categories = await fetchAllCategories(countryCode ?? DEFAULT_COUNTRY)

    if (!Array.isArray(categories)) {
      return []
    }

    return categories
      .filter((category): category is CategorySummary => Boolean(category?.slug && category?.name))
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category.count,
      }))
  } catch (error) {
    console.error("[CategoryMenu] Failed to load categories", { error, countryCode })
    return []
  }
})

function CategoryMenuSkeleton() {
  return (
    <nav className="mb-6 overflow-x-auto scrollbar-hide" aria-label="Categories loading">
      <div className="flex space-x-2 whitespace-nowrap pb-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
    </nav>
  )
}

async function CategoryMenuContent({ countryCode }: { countryCode?: string }) {
  const categories = await loadCategories(countryCode)

  if (categories.length === 0) {
    return null
  }

  return (
    <nav className="mb-6 overflow-x-auto scrollbar-hide" aria-label="Categories">
      <div className="flex space-x-2 whitespace-nowrap pb-2">
        {categories.map((category) => (
          <Button
            key={category.slug}
            variant="outline"
            size="sm"
            className="rounded-full transition-colors hover:bg-blue-50 hover:text-blue-700"
            asChild
          >
            <Link href={getCategoryUrl(category.slug)}>
              {category.name}
              {typeof category.count === "number" && (
                <span className="ml-1 text-xs text-gray-500">({category.count})</span>
              )}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  )
}

export default function CategoryMenu({ countryCode }: { countryCode?: string }) {
  return (
    <Suspense fallback={<CategoryMenuSkeleton />}>
      {/* @ts-expect-error Async Server Component */}
      <CategoryMenuContent countryCode={countryCode} />
    </Suspense>
  )
}
