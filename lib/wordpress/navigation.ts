import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { cacheTags } from "@/lib/cache/cacheTags"
import { getRestBase } from "@/lib/wp-endpoints"
import { getCategoriesForCountry } from "@/lib/wordpress/categories"
import type { WordPressCategory } from "@/types/wp"

export interface WordPressNavigationItem extends WordPressCategory {
  href?: string
}

type WordPressMenuLocationResponse = {
  menu?: number | string | { id?: number; term_id?: number } | null
}

type WordPressMenuItemResponse = {
  id?: number
  title?: string | { rendered?: string }
  url?: string
  attr_title?: string
  description?: string
  object_id?: number
  object_slug?: string
  slug?: string
  menu_order?: number
  parent?: number
}

const MENU_LOCATION_CANDIDATES = ["primary", "main", "header", "header-menu", "main-menu", "top"]

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, "").trim()

const normalizeRestBase = (restBase: string): string => restBase.replace(/\/+$/, "")

const normalizeMenuUrl = (rawUrl: string | undefined): string | undefined => {
  const url = rawUrl?.trim()

  if (!url) {
    return undefined
  }

  if (url.startsWith("/")) {
    return url
  }

  try {
    const parsed = new URL(url)

    if (parsed.hostname === "newsonafrica.com" || parsed.hostname.endsWith(".newsonafrica.com")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    return undefined
  }

  return url
}

const slugFromHref = (href: string | undefined): string | undefined => {
  if (!href) {
    return undefined
  }

  try {
    const path = href.startsWith("http") ? new URL(href).pathname : href.split("?")[0]?.split("#")[0]
    const parts = path?.split("/").filter(Boolean) ?? []

    const categoryIndex = parts.findIndex((part) => part === "category")
    if (categoryIndex >= 0 && parts[categoryIndex + 1]) {
      return parts[categoryIndex + 1]
    }

    return parts.at(-1)
  } catch {
    return undefined
  }
}

const readMenuId = (location: WordPressMenuLocationResponse): number | null => {
  const menu = location.menu

  if (typeof menu === "number") {
    return menu
  }

  if (typeof menu === "string") {
    const parsed = Number.parseInt(menu, 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (menu && typeof menu === "object") {
    return menu.id ?? menu.term_id ?? null
  }

  return null
}

async function fetchPrimaryMenuId(restBase: string, countryCode: string): Promise<number | null> {
  for (const location of MENU_LOCATION_CANDIDATES) {
    try {
      const response = await fetch(`${restBase}/menu-locations/${location}`, {
        next: {
          revalidate: CACHE_DURATIONS.SHORT,
          tags: [cacheTags.edition(countryCode)],
        },
      })

      if (!response.ok) {
        continue
      }

      const data = (await response.json()) as WordPressMenuLocationResponse
      const menuId = readMenuId(data)

      if (menuId) {
        return menuId
      }
    } catch {
      // Menu endpoints vary by WordPress setup. Fall back to categories below.
    }
  }

  return null
}

async function fetchMenuItems(restBase: string, menuId: number, countryCode: string): Promise<WordPressMenuItemResponse[]> {
  try {
    const params = new URLSearchParams({
      menus: String(menuId),
      per_page: "100",
      orderby: "menu_order",
      order: "asc",
    })

    const response = await fetch(`${restBase}/menu-items?${params.toString()}`, {
      next: {
        revalidate: CACHE_DURATIONS.SHORT,
        tags: [cacheTags.edition(countryCode)],
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data) ? (data as WordPressMenuItemResponse[]) : []
  } catch {
    return []
  }
}

const mapMenuItem = (item: WordPressMenuItemResponse): WordPressNavigationItem | null => {
  const rawTitle = typeof item.title === "string" ? item.title : item.title?.rendered
  const name = stripHtml(rawTitle ?? item.attr_title ?? "")
  const href = normalizeMenuUrl(item.url)
  const slug = item.object_slug ?? item.slug ?? slugFromHref(href)

  if (!name || !slug) {
    return null
  }

  return {
    id: item.object_id ?? item.id ?? 0,
    databaseId: item.object_id,
    name,
    slug,
    description: item.description?.trim() || undefined,
    href,
  }
}

export async function getNavigationItemsForCountry(countryCode: string): Promise<WordPressNavigationItem[]> {
  const restBase = normalizeRestBase(getRestBase(countryCode))
  const menuId = await fetchPrimaryMenuId(restBase, countryCode)

  if (menuId) {
    const menuItems = await fetchMenuItems(restBase, menuId, countryCode)
    const normalizedMenuItems = menuItems
      .filter((item) => !item.parent)
      .sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0))
      .map((item) => mapMenuItem(item))
      .filter((item): item is WordPressNavigationItem => Boolean(item))

    if (normalizedMenuItems.length > 0) {
      return normalizedMenuItems
    }
  }

  return getCategoriesForCountry(countryCode)
}
