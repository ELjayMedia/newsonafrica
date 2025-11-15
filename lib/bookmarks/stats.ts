import type { SupabaseServerClient } from "@/app/actions/supabase"
import type { BookmarkStats } from "@/types/bookmarks"
import { executeListQuery } from "@/lib/supabase/list-query"

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
}

const DEFAULT_STATS: BookmarkStats = { total: 0, unread: 0, categories: {} }

export function buildBookmarkStats({
  statusRows,
  categoryRows,
}: BookmarkStatsAggregates): BookmarkStats {
  const categories: Record<string, number> = {}
  let total = 0
  let unread = 0

  for (const row of statusRows) {
    const count = Number(row.count ?? 0)
    total += count
    if (!row.readState || row.readState !== "read") {
      unread += count
    }
  }

  for (const row of categoryRows) {
    if (!row.category) continue
    const count = Number(row.count ?? 0)
    categories[row.category] = count
  }

  return {
    total,
    unread,
    categories,
  }
}

export async function fetchBookmarkStats(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<BookmarkStats> {
  const [statusResult, categoryResult] = await Promise.all([
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
  ])

  if (statusResult.error) {
    throw statusResult.error
  }

  if (categoryResult.error) {
    throw categoryResult.error
  }

  const statusRows = (statusResult.data ?? []) as StatusAggregateRow[]
  const categoryRows = (categoryResult.data ?? []) as CategoryAggregateRow[]

  return buildBookmarkStats({ statusRows, categoryRows })
}

export function getDefaultBookmarkStats(): BookmarkStats {
  return { ...DEFAULT_STATS, categories: { ...DEFAULT_STATS.categories } }
}
