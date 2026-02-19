import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  BookmarkUserCounterInsert,
  BookmarkUserCounterRow,
} from "@/types/bookmarks"
import type { Database, Json } from "@/types/supabase"

type BookmarkSupabaseClient = SupabaseClient<Database>

export interface BookmarkCounterDelta {
  total?: number
  unread?: number
  read?: number
  collectionUnread?: Record<string, number>
}

export type CollectionUnreadCounts = Record<string, number>

function parseCollectionCounts(value: Json | null): CollectionUnreadCounts {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const next: CollectionUnreadCounts = {}

  for (const [key, rawValue] of entries) {
    const parsed = Number(rawValue)
    if (Number.isFinite(parsed) && parsed > 0) {
      next[key] = parsed
    }
  }

  return next
}

function sanitizeCollectionCounts(counts: CollectionUnreadCounts): CollectionUnreadCounts {
  return Object.entries(counts).reduce<CollectionUnreadCounts>((acc, [key, value]) => {
    if (value > 0) {
      acc[key] = value
    }
    return acc
  }, {})
}

async function loadExistingCounters(
  client: BookmarkSupabaseClient,
  userId: string,
): Promise<BookmarkUserCounterRow | null> {
  const { data, error } = await client
    .from("bookmark_user_counters")
    .select("user_id, total_count, unread_count, read_count, collections_count, collection_unread_counts")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as BookmarkUserCounterRow | null
}

function buildCounterPayload(
  current: BookmarkUserCounterRow | null,
  userId: string,
  delta: BookmarkCounterDelta,
): BookmarkUserCounterInsert {
  const existingTotals = {
    total: current?.total_count ?? 0,
    unread: current?.unread_count ?? 0,
  }

  const nextTotal = Math.max(0, existingTotals.total + (delta.total ?? 0))
  const nextUnread = Math.max(0, existingTotals.unread + (delta.unread ?? 0))
  const nextRead = Math.max(0, nextTotal - nextUnread)

  const existingCollectionCounts = parseCollectionCounts(current?.collection_unread_counts ?? null)
  const collectionDelta = delta.collectionUnread ?? {}
  const mergedCounts: CollectionUnreadCounts = { ...existingCollectionCounts }

  for (const [key, change] of Object.entries(collectionDelta)) {
    if (!change) continue
    const nextValue = Math.max(0, (mergedCounts[key] ?? 0) + change)
    if (nextValue === 0) {
      delete mergedCounts[key]
    } else {
      mergedCounts[key] = nextValue
    }
  }

  const sanitizedCounts = sanitizeCollectionCounts(mergedCounts)

  return {
    user_id: userId,
    total_count: nextTotal,
    unread_count: nextUnread,
    read_count: nextRead,
    collections_count: Object.keys(sanitizedCounts).length,
    collection_unread_counts: sanitizedCounts,
    updated_at: new Date().toISOString(),
  }
}

export async function applyBookmarkCounterDelta(
  client: BookmarkSupabaseClient,
  params: { userId: string; delta: BookmarkCounterDelta },
): Promise<void> {
  const { delta, userId } = params
  if (!userId) {
    throw new Error("userId is required to update bookmark counters")
  }

  const hasCollectionDelta = Boolean(delta.collectionUnread && Object.keys(delta.collectionUnread).length)
  const hasNumericalDelta = Boolean((delta.total ?? 0) || (delta.unread ?? 0) || (delta.read ?? 0))

  if (!hasCollectionDelta && !hasNumericalDelta) {
    return
  }

  const existing = await loadExistingCounters(client, userId)
  const payload = buildCounterPayload(existing, userId, delta)

  const { error } = await client
    .from("bookmark_user_counters")
    .upsert(payload, { onConflict: "user_id" })

  if (error) {
    throw error
  }
}
