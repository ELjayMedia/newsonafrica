"use client"

import { useState, useEffect, type KeyboardEvent, type FocusEvent } from "react"
import { ChevronDown } from "lucide-react"
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
    <ul
      className="flex whitespace-nowrap px-4 border-t border-gray-200 font-light"
      role="menubar"
    >
      {tree.map((cat) => (
        <NavItem
          key={cat.slug}
          category={cat}
          depth={0}
          activeSlug={activeSlug}
          onNavigate={onNavigate}
        />
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
  const menuId = `${slug}-menu`
  const containsActive = categoryContainsSlug(category, activeSlug)
  const [open, setOpen] = useState(containsActive)

  useEffect(() => {
    setOpen(containsActive)
  }, [containsActive])

  const handleClick = () => {
    if (hasChildren) {
      setOpen((o) => !o)
    } else {
      onNavigate?.(slug)
    }
  }

  const moveFocus = (element: Element | null) => {
    const btn = element?.querySelector<HTMLButtonElement>("button")
    btn?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "Enter":
      case " ":
        if (hasChildren) {
          e.preventDefault()
          setOpen((o) => !o)
        }
        break
      case "ArrowDown":
        e.preventDefault()
        if (hasChildren && !open) {
          setOpen(true)
          moveFocus(e.currentTarget.nextElementSibling?.firstElementChild as Element)
        } else {
          moveFocus(e.currentTarget.closest("li")?.nextElementSibling as Element)
        }
        break
      case "ArrowUp":
        e.preventDefault()
        moveFocus(e.currentTarget.closest("li")?.previousElementSibling as Element)
        break
      case "ArrowRight":
        e.preventDefault()
        if (depth === 0) {
          moveFocus(e.currentTarget.closest("li")?.nextElementSibling as Element)
        } else if (hasChildren) {
          setOpen(true)
          moveFocus(e.currentTarget.nextElementSibling?.firstElementChild as Element)
        }
        break
      case "ArrowLeft":
        e.preventDefault()
        if (depth === 0) {
          moveFocus(e.currentTarget.closest("li")?.previousElementSibling as Element)
        } else {
          setOpen(false)
          moveFocus(e.currentTarget.closest("ul")?.parentElement as Element)
        }
        break
      case "Escape":
        setOpen(false)
        moveFocus(e.currentTarget.closest("ul")?.parentElement as Element)
        break
    }
  }

  const handleBlur = (e: FocusEvent<HTMLLIElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setOpen(false)
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
      onBlur={handleBlur}
    >
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-haspopup={hasChildren ? "menu" : undefined}
        aria-expanded={hasChildren ? open : undefined}
        aria-controls={hasChildren ? menuId : undefined}
        role="menuitem"
        className={linkClasses}
      >
        {name.toUpperCase()}
        {hasChildren && (
          <span className="ml-1 inline-flex items-center">
            <ChevronDown aria-hidden="true" className="h-3 w-3" />
            <span className="sr-only">Toggle submenu</span>
          </span>
        )}
      </button>
      {hasChildren && (
        <ul id={menuId} role="menu" className={menuClasses}>
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

function categoryContainsSlug(category: CategoryNode, slug?: string): boolean {
  if (!slug) return false
  if (category.slug === slug) return true
  return category.children.some((child) => categoryContainsSlug(child, slug))
}

export default CategoryDropdownNav

