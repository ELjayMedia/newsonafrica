import type { SupabaseServerClient } from "@/app/actions/supabase"
import type {
  BookmarkStats,
  BookmarkReadState,
  BookmarkReadStateKey,
} from "@/types/bookmarks"
import { executeListQuery } from "@/lib/supabase/list-query"
import { resolveReadStateKey, isUnreadReadStateKey } from "@/lib/bookmarks/read-state"
import { collectionKeyForId } from "@/lib/bookmarks/collection-keys"

export interface StatusAggregateRow {
  readState: BookmarkReadState | null
  count: number | null
}

export interface CategoryAggregateRow {
  category: string | null
  count: number | null
}

export interface BookmarkStatsAggregates {
  statusRows?: StatusAggregateRow[]
  categoryRows?: CategoryAggregateRow[]
  collectionRows?: CollectionAggregateRow[]
  counterRow?: CounterAggregateRow | null
}

export interface CollectionAggregateRow {
  collectionId: string | null
  readState: BookmarkReadState | null
  count: number | null
}

export interface CounterAggregateRow {
  totalCount: number | null
  unreadCount: number | null
  readCount: number | null
  collectionUnreadCounts: Record<string, unknown> | null
}

const DEFAULT_STATS: BookmarkStats = {
  total: 0,
  unread: 0,
  categories: {},
  readStates: {},
  collections: {},
}

function parseCollectionCounts(
  counts: CounterAggregateRow["collectionUnreadCounts"],
): Record<string, number> {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    return {}
  }

  const entries = Object.entries(counts as Record<string, unknown>)
  const result: Record<string, number> = {}

  for (const [key, rawValue] of entries) {
    const value = Number(rawValue)
    if (Number.isFinite(value) && value > 0) {
      result[key] = value
    }
  }

  return result
}

export function buildBookmarkStats({
  statusRows = [],
  categoryRows = [],
  collectionRows = [],
  counterRow = null,
}: BookmarkStatsAggregates): BookmarkStats {
  const categories: Record<string, number> = {}
  const readStates: Record<BookmarkReadStateKey, number> = {}
  const collections: Record<string, number> = counterRow
    ? parseCollectionCounts(counterRow.collectionUnreadCounts)
    : {}
  let totalFromStatuses = 0
  let unreadFromStatuses = 0

  for (const row of statusRows) {
    const count = Number(row.count ?? 0)
    totalFromStatuses += count
    const stateKey = resolveReadStateKey(row.readState as BookmarkReadState | null)
    readStates[stateKey] = (readStates[stateKey] ?? 0) + count
    if (isUnreadReadStateKey(stateKey)) unreadFromStatuses += count
  }

  for (const row of categoryRows) {
    if (!row.category) continue
    const count = Number(row.count ?? 0)
    categories[row.category] = count
  }

  if (!counterRow || !Object.keys(collections).length) {
    for (const row of collectionRows) {
      const count = Number(row.count ?? 0)
      if (!count) continue
      const stateKey = resolveReadStateKey(row.readState as BookmarkReadState | null)
      if (!isUnreadReadStateKey(stateKey)) continue
      const key = collectionKeyForId(row.collectionId ?? null)
      collections[key] = (collections[key] ?? 0) + count
    }
  }

  const total = typeof counterRow?.totalCount === "number" ? counterRow.totalCount : totalFromStatuses
  const unread = typeof counterRow?.unreadCount === "number" ? counterRow.unreadCount : unreadFromStatuses

  return {
    total,
    unread,
    categories,
    readStates,
    collections,
  }
}

export async function fetchBookmarkStats(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<BookmarkStats> {
  const [statusResult, categoryResult, counterResult] = await Promise.all([
    executeListQuery(supabase, "bookmarks", (query) =>
      query
        .select("read_state:readState, count:count(*)", { head: false })
        .eq("user_id", userId)
        .group("read_state"),
    ),
    executeListQuery(supabase, "bookmarks", (query) =>
      query
        .select("category, count:count(*)", { head: false })
        .eq("user_id", userId)
        .not("category", "is", null)
        .group("category"),
    ),
    executeListQuery(supabase, "bookmark_user_counters", (query) =>
      query
        .select(
          [
            "total_count:totalCount",
            "unread_count:unreadCount",
            "read_count:readCount",
            "collection_unread_counts:collectionUnreadCounts",
          ].join(", "),
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ),
  ])

  if (statusResult.error) {
    throw statusResult.error
  }

  if (categoryResult.error) {
    throw categoryResult.error
  }

  if (counterResult.error) {
    throw counterResult.error
  }

  const statusRows = (statusResult.data ?? []) as StatusAggregateRow[]
  const categoryRows = (categoryResult.data ?? []) as CategoryAggregateRow[]
  const counterRow = (counterResult.data ?? null) as CounterAggregateRow | null

  return buildBookmarkStats({ statusRows, categoryRows, counterRow })
}

export function getDefaultBookmarkStats(): BookmarkStats {
  return {
    ...DEFAULT_STATS,
    categories: { ...DEFAULT_STATS.categories },
    readStates: { ...DEFAULT_STATS.readStates },
    collections: { ...DEFAULT_STATS.collections },
  }
}
