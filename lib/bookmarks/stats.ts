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
  readState: string | null
  count: number | null
}

export interface CategoryAggregateRow {
  category: string | null
  count: number | null
}

export interface BookmarkStatsAggregates {
  statusRows: StatusAggregateRow[]
  categoryRows: CategoryAggregateRow[]
  collectionRows: CollectionAggregateRow[]
}

export interface CollectionAggregateRow {
  collectionId: string | null
  readState: string | null
  count: number | null
}

const DEFAULT_STATS: BookmarkStats = {
  total: 0,
  unread: 0,
  categories: {},
  readStates: {},
  collections: {},
}

export function buildBookmarkStats({
  statusRows,
  categoryRows,
  collectionRows,
}: BookmarkStatsAggregates): BookmarkStats {
  const categories: Record<string, number> = {}
  const readStates: Record<BookmarkReadStateKey, number> = {}
  const collections: Record<string, number> = {}
  let total = 0
  let unread = 0

  for (const row of statusRows) {
    const count = Number(row.count ?? 0)
    total += count
    const stateKey = resolveReadStateKey(row.readState as BookmarkReadState | null)
    readStates[stateKey] = (readStates[stateKey] ?? 0) + count
    if (isUnreadReadStateKey(stateKey)) unread += count
  }

  for (const row of categoryRows) {
    if (!row.category) continue
    const count = Number(row.count ?? 0)
    categories[row.category] = count
  }

  for (const row of collectionRows) {
    const count = Number(row.count ?? 0)
    if (!count) continue
    const stateKey = resolveReadStateKey(row.readState as BookmarkReadState | null)
    if (!isUnreadReadStateKey(stateKey)) continue
    const key = collectionKeyForId(row.collectionId ?? null)
    collections[key] = (collections[key] ?? 0) + count
  }

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
  const [statusResult, categoryResult, collectionResult] = await Promise.all([
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
    executeListQuery(supabase, "bookmarks", (query) =>
      query
        .select("collection_id:collectionId, read_state:readState, count:count(*)", { head: false })
        .eq("user_id", userId)
        .group("collection_id, read_state"),
    ),
  ])

  if (statusResult.error) {
    throw statusResult.error
  }

  if (categoryResult.error) {
    throw categoryResult.error
  }

  if (collectionResult.error) {
    throw collectionResult.error
  }

  const statusRows = (statusResult.data ?? []) as StatusAggregateRow[]
  const categoryRows = (categoryResult.data ?? []) as CategoryAggregateRow[]
  const collectionRows = (collectionResult.data ?? []) as CollectionAggregateRow[]

  return buildBookmarkStats({ statusRows, categoryRows, collectionRows })
}

export function getDefaultBookmarkStats(): BookmarkStats {
  return {
    ...DEFAULT_STATS,
    categories: { ...DEFAULT_STATS.categories },
    readStates: { ...DEFAULT_STATS.readStates },
    collections: { ...DEFAULT_STATS.collections },
  }
}
