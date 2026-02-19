import type { BookmarkListRow, BookmarkReadStateKey, BookmarkStatsDelta } from "@/types/bookmarks"
import { collectionKeyForId } from "@/lib/bookmarks/collection-keys"
import { isUnreadReadStateKey, resolveReadStateKey } from "@/lib/bookmarks/read-state"

function createEmptyReadStateCounts(): Record<BookmarkReadStateKey, number> {
  return {
    unread: 0,
    in_progress: 0,
    read: 0,
    unknown: 0,
  }
}

export function createEmptyStatsDelta(): BookmarkStatsDelta {
  return { total: 0, unread: 0, categories: {}, readStates: createEmptyReadStateCounts(), collections: {} }
}

function mergeCategoryDelta(
  accumulator: Record<string, number>,
  category: string | null | undefined,
  delta: number,
): void {
  if (!category) {
    return
  }

  mergeCountDelta(accumulator, category, delta)
}

function mergeCountDelta(
  accumulator: Record<string, number>,
  key: string,
  delta: number,
): void {
  const next = (accumulator[key] ?? 0) + delta
  if (next === 0) {
    delete accumulator[key]
    return
  }

  accumulator[key] = next
}

export function computeStatsDelta({
  previous,
  next,
}: {
  previous?: BookmarkListRow | null
  next?: BookmarkListRow | null
}): BookmarkStatsDelta {
  const delta = createEmptyStatsDelta()

  if (previous) {
    delta.total -= 1
    const readStateKey = resolveReadStateKey(previous.readState)
    mergeCountDelta(delta.readStates, readStateKey, -1)
    if (isUnreadReadStateKey(readStateKey)) {
      delta.unread -= 1
      const collectionKey = collectionKeyForId(previous.collectionId ?? null)
      mergeCountDelta(delta.collections, collectionKey, -1)
    }
    mergeCategoryDelta(delta.categories, previous.category, -1)
  }

  if (next) {
    delta.total += 1
    const readStateKey = resolveReadStateKey(next.readState)
    mergeCountDelta(delta.readStates, readStateKey, 1)
    if (isUnreadReadStateKey(readStateKey)) {
      delta.unread += 1
      const collectionKey = collectionKeyForId(next.collectionId ?? null)
      mergeCountDelta(delta.collections, collectionKey, 1)
    }
    mergeCategoryDelta(delta.categories, next.category, 1)
  }

  return delta
}

export function combineStatsDeltas(deltas: BookmarkStatsDelta[]): BookmarkStatsDelta {
  return deltas.reduce<BookmarkStatsDelta>((acc, delta) => {
    acc.total += delta.total
    acc.unread += delta.unread

    for (const [category, value] of Object.entries(delta.categories)) {
      mergeCategoryDelta(acc.categories, category, value)
    }

    for (const [state, value] of Object.entries(delta.readStates)) {
      mergeCountDelta(acc.readStates, state, value)
    }

    for (const [collection, value] of Object.entries(delta.collections)) {
      mergeCountDelta(acc.collections, collection, value)
    }

    return acc
  }, createEmptyStatsDelta())
}
