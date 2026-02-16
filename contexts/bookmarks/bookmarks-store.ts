import { collectionKeyForId } from "@/lib/bookmarks/collection-keys"
import { isUnreadReadStateKey, resolveReadStateKey } from "@/lib/bookmarks/read-state"
import type { BookmarkStats, BookmarkStatsDelta } from "@/types/bookmarks"

export interface BookmarkRecord {
  category?: string | null
  readState?: string | null
  collectionId?: string | null
}

export const DEFAULT_STATS: BookmarkStats = {
  total: 0,
  unread: 0,
  categories: {},
  readStates: {},
  collections: {},
}

export const EMPTY_STATS_DELTA: BookmarkStatsDelta = {
  total: 0,
  unread: 0,
  categories: {},
  readStates: {},
  collections: {},
}

const mergeCountMap = (
  base: Record<string, number>,
  delta: Record<string, number>,
): Record<string, number> => {
  if (!delta || !Object.keys(delta).length) {
    return base
  }

  const next = { ...base }
  for (const [key, change] of Object.entries(delta)) {
    if (!change) continue
    const updated = (next[key] ?? 0) + change
    if (updated <= 0) {
      delete next[key]
    } else {
      next[key] = updated
    }
  }

  return next
}

export const applyStatsDelta = (stats: BookmarkStats, delta: BookmarkStatsDelta): BookmarkStats => {
  if (!delta) return stats

  const categories = mergeCountMap(stats.categories, delta.categories)
  const readStates = mergeCountMap(stats.readStates, delta.readStates)
  const collections = mergeCountMap(stats.collections, delta.collections)

  return {
    total: Math.max(0, stats.total + delta.total),
    unread: Math.max(0, stats.unread + delta.unread),
    categories,
    readStates,
    collections,
  }
}

export const deriveStatsFromBookmarks = (items: BookmarkRecord[]): BookmarkStats => {
  const categories: Record<string, number> = {}
  const readStates: Record<string, number> = {}
  const collections: Record<string, number> = {}
  let unread = 0

  for (const bookmark of items) {
    if (bookmark.category) {
      categories[bookmark.category] = (categories[bookmark.category] || 0) + 1
    }

    const readStateKey = resolveReadStateKey(bookmark.readState)
    readStates[readStateKey] = (readStates[readStateKey] || 0) + 1
    if (isUnreadReadStateKey(readStateKey)) {
      unread += 1
      const collectionKey = collectionKeyForId(bookmark.collectionId ?? null)
      collections[collectionKey] = (collections[collectionKey] || 0) + 1
    }
  }

  return {
    total: items.length,
    unread,
    categories,
    readStates,
    collections,
  }
}

export const hasStatsDelta = (delta: BookmarkStatsDelta): boolean =>
  delta.total !== 0 ||
  delta.unread !== 0 ||
  Object.keys(delta.categories).length > 0 ||
  Object.keys(delta.readStates).length > 0 ||
  Object.keys(delta.collections).length > 0
