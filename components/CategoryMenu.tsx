import { getServerCategories } from "@/lib/categories"
import CategoryMenuClient from "./CategoryMenuClient"

const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

interface CategoryMenuProps {
  countryCode?: string
}

export default async function CategoryMenu({
  countryCode = DEFAULT_COUNTRY,
}: CategoryMenuProps) {
  const { categories } = await getServerCategories(countryCode)
  const list = categories[countryCode] || []
  if (!list || list.length === 0) {
    return null
  }

  return (
    <nav aria-label="Site categories">
      <div className="overflow-x-auto">
        <CategoryMenuClient categories={list} />
      </div>
    </nav>
  )
}

