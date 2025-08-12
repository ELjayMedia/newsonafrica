'use client'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useNav } from "@/contexts/NavContext"

export default function CategoryMenu() {
  const { items } = useNav()

  if (!items || items.length === 0) {
    return null
  }

  return (
    <nav className="mb-6 overflow-x-auto scrollbar-hide" aria-label="Categories">
      <div className="flex space-x-2 whitespace-nowrap pb-2">
        {items.map((category) => (
          <Button
            key={category.href}
            variant="outline"
            size="sm"
            className="rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors"
            asChild
          >
            <Link href={category.href}>
              {category.title}
              {category.count !== undefined && (
                <span className="ml-1 text-xs text-gray-500">({category.count})</span>
              )}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  )
}
