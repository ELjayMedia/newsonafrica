import Link from "next/link"
import { fetchAllCategories } from "@/lib/wordpress-api"

export default async function CategoryMenu() {
  const categories = await fetchAllCategories()

  return (
    <nav className="mb-4 overflow-x-auto">
      <ul className="flex space-x-3 whitespace-nowrap">
        {categories.map((category: { name: string; slug: string }) => (
          <li key={category.slug}>
            <Link href={`/category/${category.slug}`} className="text-sm text-blue-600 hover:underline">
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
