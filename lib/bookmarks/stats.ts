import type { SupabaseServerClient } from "@/app/actions/supabase"
import type {
  BookmarkStats,
  BookmarkReadState,
  BookmarkReadStateKey,
} from "@/types/bookmarks"
import { executeListQuery } from "@/lib/supabase/list-query"
import { resolveReadStateKey, isUnreadReadStateKey } from "@/lib/bookmarks/read-state"
import { collectionKeyForId } from "@/lib/bookmarks/collection-keys"

interface ReadStateAggregateFields {
  readState?: BookmarkReadState | null
  read_state?: BookmarkReadState | null
}

export interface StatusAggregateRow extends ReadStateAggregateFields {
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

export interface CollectionAggregateRow extends ReadStateAggregateFields {
  collectionId?: string | null
  collection_id?: string | null
  count: number | null
}

export interface CounterAggregateRow {
  totalCount?: number | null
  total_count?: number | null
  unreadCount?: number | null
  unread_count?: number | null
  readCount?: number | null
  read_count?: number | null
  collectionUnreadCounts?: Record<string, unknown> | null
  collection_unread_counts?: Record<string, unknown> | null
}

interface BookmarkStatsSourceRow extends ReadStateAggregateFields {
  category?: string | null
  collectionId?: string | null
  collection_id?: string | null
}

const DEFAULT_STATS: BookmarkStats = {
  total: 0,
  unread: 0,
  categories: {},
  readStates: {
    unread: 0,
    in_progress: 0,
    read: 0,
    unknown: 0,
  },
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

function extractReadState(row: ReadStateAggregateFields): BookmarkReadState | null {
  return (row.readState ?? row.read_state ?? null) as BookmarkReadState | null
}

function extractCollectionId(row: CollectionAggregateRow | BookmarkStatsSourceRow): string | null {
  return row.collectionId ?? row.collection_id ?? null
}

function normalizeCounterRow(row: CounterAggregateRow | null): CounterAggregateRow | null {
  if (!row) return null

  return {
    totalCount: row.totalCount ?? row.total_count ?? null,
    unreadCount: row.unreadCount ?? row.unread_count ?? null,
    readCount: row.readCount ?? row.read_count ?? null,
    collectionUnreadCounts: row.collectionUnreadCounts ?? row.collection_unread_counts ?? null,
  }
}

function buildAggregatesFromBookmarks(rows: BookmarkStatsSourceRow[]): BookmarkStatsAggregates {
  const statusMap = new Map<BookmarkReadStateKey, StatusAggregateRow>()
  const categoryMap = new Map<string, CategoryAggregateRow>()
  const collectionMap = new Map<string, CollectionAggregateRow>()

  for (const row of rows) {
    const state = extractReadState(row)
    const stateKey = resolveReadStateKey(state)
    const currentStatus = statusMap.get(stateKey) ?? { readState: state, count: 0 }
    currentStatus.count = Number(currentStatus.count ?? 0) + 1
    statusMap.set(stateKey, currentStatus)

    if (row.category) {
      const currentCategory = categoryMap.get(row.category) ?? { category: row.category, count: 0 }
      currentCategory.count = Number(currentCategory.count ?? 0) + 1
      categoryMap.set(row.category, currentCategory)
    }

    const collectionKey = `${collectionKeyForId(extractCollectionId(row))}:${stateKey}`
    const currentCollection = collectionMap.get(collectionKey) ?? {
      collectionId: extractCollectionId(row),
      readState: state,
      count: 0,
    }
    currentCollection.count = Number(currentCollection.count ?? 0) + 1
    collectionMap.set(collectionKey, currentCollection)
  }

  return {
    statusRows: [...statusMap.values()],
    categoryRows: [...categoryMap.values()],
    collectionRows: [...collectionMap.values()],
  }
}

export function buildBookmarkStats({
  statusRows = [],
  categoryRows = [],
  collectionRows = [],
  counterRow = null,
}: BookmarkStatsAggregates): BookmarkStats {
  const normalizedCounterRow = normalizeCounterRow(counterRow)
  const categories: Record<string, number> = {}
  const readStates: Record<BookmarkReadStateKey, number> = { ...DEFAULT_STATS.readStates }
  const collections: Record<string, number> = normalizedCounterRow
    ? parseCollectionCounts(normalizedCounterRow.collectionUnreadCounts ?? null)
    : {}
  let totalFromStatuses = 0
  let unreadFromStatuses = 0

  for (const row of statusRows) {
    const count = Number(row.count ?? 0)
    totalFromStatuses += count
    const stateKey = resolveReadStateKey(extractReadState(row))
    readStates[stateKey] = (readStates[stateKey] ?? 0) + count
    if (isUnreadReadStateKey(stateKey)) unreadFromStatuses += count
  }

  for (const row of categoryRows) {
    if (!row.category) continue
    const count = Number(row.count ?? 0)
    categories[row.category] = count
  }

  if (!normalizedCounterRow || !Object.keys(collections).length) {
    for (const row of collectionRows) {
      const count = Number(row.count ?? 0)
      if (!count) continue
      const stateKey = resolveReadStateKey(extractReadState(row))
      if (!isUnreadReadStateKey(stateKey)) continue
      const key = collectionKeyForId(extractCollectionId(row))
      collections[key] = (collections[key] ?? 0) + count
    }
  }

  const total = typeof normalizedCounterRow?.totalCount === "number" ? normalizedCounterRow.totalCount : totalFromStatuses
  const unread = typeof normalizedCounterRow?.unreadCount === "number" ? normalizedCounterRow.unreadCount : unreadFromStatuses

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
  const [bookmarksResult, counterResult] = await Promise.all([
    executeListQuery(supabase, "bookmarks", async (query) =>
      query
        .select("read_state, category, collection_id")
        .eq("user_id", userId),
    ),
    executeListQuery(supabase, "bookmark_user_counters", async (query) =>
      query
        .select(
          [
            "total_count",
            "unread_count",
            "read_count",
            "collection_unread_counts",
          ].join(", "),
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ),
  ])

  if (bookmarksResult.error) {
    throw bookmarksResult.error
  }

  if (counterResult.error) {
    throw counterResult.error
  }

  const sourceRows = (bookmarksResult.data ?? []) as BookmarkStatsSourceRow[]
  const counterRow = (counterResult.data ?? null) as CounterAggregateRow | null

  return buildBookmarkStats({
    ...buildAggregatesFromBookmarks(sourceRows),
    counterRow,
  })
}

export function getDefaultBookmarkStats(): BookmarkStats {
  return {
    ...DEFAULT_STATS,
    categories: { ...DEFAULT_STATS.categories },
    readStates: { ...DEFAULT_STATS.readStates },
    collections: { ...DEFAULT_STATS.collections },
  }
}
