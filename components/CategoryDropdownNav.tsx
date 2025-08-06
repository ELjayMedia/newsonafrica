"use client"

import { useState, type KeyboardEvent } from "react"
import { type WordPressCategory } from "@/lib/api/wordpress"

interface CategoryDropdownNavProps {
  categories: WordPressCategory[]
  activeSlug?: string
  onNavigate?: (slug: string) => void
}

interface CategoryNode extends WordPressCategory {
  children: CategoryNode[]
}

export function CategoryDropdownNav({ categories, activeSlug, onNavigate }: CategoryDropdownNavProps) {
  const tree = buildCategoryTree(categories)

  return (
    <ul className="flex whitespace-nowrap px-4 border-t border-gray-200 font-light">
      {tree.map((cat) => (
        <NavItem key={cat.slug} category={cat} depth={0} activeSlug={activeSlug} onNavigate={onNavigate} />
      ))}
    </ul>
  )
}

interface NavItemProps {
  category: CategoryNode
  depth: number
  activeSlug?: string
  onNavigate?: (slug: string) => void
}

function NavItem({ category, depth, activeSlug, onNavigate }: NavItemProps) {
  const { slug, name, children } = category
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (hasChildren) {
      setOpen((o) => !o)
    } else {
      onNavigate?.(slug)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "Enter" || e.key === " ") && hasChildren) {
      e.preventDefault()
      setOpen((o) => !o)
    }
  }

  const linkClasses = `block px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
    activeSlug === slug
      ? "text-blue-600 border-b-2 border-blue-600"
      : "text-gray-700 hover:text-blue-600 hover:border-b-2 hover:border-blue-600"
  } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`

  const menuClasses = `absolute bg-white border shadow-lg ${open ? "block" : "hidden"} ${
    depth === 0 ? "left-0 top-full mt-1" : "left-full top-0"}
  `

  return (
    <li
      className="relative group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-haspopup={hasChildren ? "menu" : undefined}
        aria-expanded={hasChildren ? open : undefined}
        className={linkClasses}
      >
        {name.toUpperCase()}
        {hasChildren && <span className="ml-1 text-xs">▼</span>}
      </button>
      {hasChildren && (
        <ul className={menuClasses}>
          {children.map((child) => (
            <NavItem
              key={child.slug}
              category={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function buildCategoryTree(categories: WordPressCategory[]): CategoryNode[] {
  const map: Record<string, CategoryNode> = {}
  categories.forEach((cat) => {
    map[cat.slug] = { ...cat, children: [] }
  })

  const roots: CategoryNode[] = []
  categories.forEach((cat) => {
    const parentSlug = cat.parent?.node?.slug
    if (parentSlug && map[parentSlug]) {
      map[parentSlug].children.push(map[cat.slug])
    } else {
      roots.push(map[cat.slug])
    }
  })

  return roots
}

export default CategoryDropdownNav

