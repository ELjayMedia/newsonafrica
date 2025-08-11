"use client"

import React from "react"
import SidebarWidget from "./ui/sidebar-widget"
import HeadlineList, { type HeadlineItem } from "./ui/headline-list"
import { designTokens, combineTokens } from "./ui/design-tokens"

type MostReadItem = {
  id?: string | number
  title: string
  href: string
}

type ApiItem = {
  id?: string | number
  title?: string
  slug?: string
  link?: string
  url?: string
}

/**
 * MostRead
 * - Attempts to fetch from /api/most-read first.
 * - Falls back to /api/posts (limit=5) if primary fails.
 * - Final fallback: empty state.
 * - Always renders exactly 5 slots: shows skeleton while loading.
 */
export function MostRead() {
  const [items, setItems] = React.useState<MostReadItem[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const list = await fetchMostRead()
        if (!cancelled) setItems(list)
      } catch (err) {
        if (!cancelled) setError("Failed to load.")
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const skeleton = (
    <ol className="space-y-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="grid grid-cols-[2rem_1fr] gap-3 items-start">
          <span
            className={combineTokens(
              "font-extrabold",
              designTokens.typography.special.number,
              designTokens.colors.text.muted,
            )}
          >
            {i + 1}
          </span>
          <div className={combineTokens("h-5 w-full animate-pulse rounded", designTokens.colors.surface)} />
        </li>
      ))}
    </ol>
  )

  return (
    <SidebarWidget title="Most Read">
      {!items && !error ? (
        skeleton
      ) : items && items.length > 0 ? (
        <HeadlineList items={items as HeadlineItem[]} max={5} numbered />
      ) : (
        <p className={combineTokens(designTokens.typography.body.small, designTokens.colors.text.muted)}>
          No popular articles yet.
        </p>
      )}
    </SidebarWidget>
  )
}

async function fetchMostRead(): Promise<MostReadItem[]> {
  // Try the dedicated API first (server may aggregate from Supabase or WP)
  try {
    const res = await fetch(`/api/most-read?limit=5`, { cache: "no-store" })
    if (res.ok) {
      const data: ApiItem[] = await res.json()
      return mapApiItems(data)
    }
  } catch {
    // continue to fallback
  }

  // Fallback to posts API if available
  try {
    const res = await fetch(`/api/posts?limit=5`, { cache: "no-store" })
    if (res.ok) {
      const data: ApiItem[] = await res.json()
      return mapApiItems(data)
    }
  } catch {
    // ignore
  }

  return []
}

function mapApiItems(data: ApiItem[]): MostReadItem[] {
  return (data || [])
    .filter((d) => d && (d.title || d.slug))
    .slice(0, 5)
    .map((d) => ({
      id: d.id ?? d.slug ?? d.link ?? d.url ?? Math.random().toString(36).slice(2),
      title: d.title ?? d.slug ?? "Untitled",
      href: d.link ?? d.url ?? (d.slug ? `/post/${d.slug}` : "#"),
    }))
}

export default MostRead
