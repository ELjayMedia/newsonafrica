import Link from "next/link"
import { fetchAllCategories } from "@/lib/wordpress-api"
import { Button } from "@/components/ui/button"

export default async function CategoryMenu() {
  const categories = await fetchAllCategories()

  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <nav className="mb-6 overflow-x-auto scrollbar-hide" aria-label="Categories">
      <div className="flex space-x-2 whitespace-nowrap pb-2">
        {categories.map((category: { name: string; slug: string; count?: number }) => (
          <Button
            key={category.slug}
            variant="outline"
            size="sm"
            className="rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors"
            asChild
          >
            <Link href={`/category/${category.slug}`}>
              {category.name}
              {category.count !== undefined && <span className="ml-1 text-xs text-gray-500">({category.count})</span>}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  )
}
