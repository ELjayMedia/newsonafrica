import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { DEFAULT_COUNTRY, getCategoryUrl } from "@/lib/utils/routing"
import { getAllCategories, type WordPressCategoryTreeNode } from "@/lib/wp-server"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderMenuProps {
  countryCode: string
}

const hasChildren = (category: WordPressCategoryTreeNode) =>
  category.children.some((child) => Boolean(child.slug?.trim()))

const normalizeCountry = (value: string): string => {
  const trimmed = value.trim().toLowerCase()
  return trimmed || DEFAULT_COUNTRY
}

export async function HeaderMenu({ countryCode }: HeaderMenuProps) {
  const normalizedCountry = normalizeCountry(countryCode)
  const categories = await getAllCategories(normalizedCountry)

  if (!categories.length) {
    return null
  }

  return (
    <nav className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <div className="hidden md:flex">
          <ul className="flex w-full items-center gap-2 overflow-x-auto px-4 py-3 text-sm font-semibold text-gray-700">
            {categories.map((category) => {
              const slug = category.slug?.trim()
              if (!slug) {
                return null
              }

              if (!hasChildren(category)) {
                return (
                  <li key={slug} className="shrink-0">
                    <Link
                      href={getCategoryUrl(slug, normalizedCountry)}
                      className="block rounded-full px-4 py-2 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      prefetch={false}
                    >
                      {category.name}
                    </Link>
                  </li>
                )
              }

              return (
                <li key={slug} className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 rounded-full px-4 py-2 transition-colors hover:bg-blue-50 hover:text-blue-600">
                        <span>{category.name}</span>
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                      <DropdownMenuItem asChild>
                        <Link href={getCategoryUrl(slug, normalizedCountry)} prefetch={false}>
                          View all {category.name}
                        </Link>
                      </DropdownMenuItem>
                      {category.children.map((child) => {
                        const childSlug = child.slug?.trim()
                        if (!childSlug) {
                          return null
                        }

                        return (
                          <DropdownMenuItem key={child.id ?? childSlug} asChild>
                            <Link href={getCategoryUrl(childSlug, normalizedCountry)} prefetch={false}>
                              {child.name}
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-1 px-4 py-3 md:hidden">
          {categories.map((category) => {
            const slug = category.slug?.trim()
            if (!slug) {
              return null
            }

            return (
              <Link
                key={slug}
                href={getCategoryUrl(slug, normalizedCountry)}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                prefetch={false}
              >
                {category.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
