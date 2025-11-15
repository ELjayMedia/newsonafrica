import type { BookmarkListRow, BookmarkStatsDelta } from "@/types/bookmarks"

export function createEmptyStatsDelta(): BookmarkStatsDelta {
  return { total: 0, unread: 0, categories: {} }
}

function mergeCategoryDelta(
  accumulator: Record<string, number>,
  category: string | null | undefined,
  delta: number,
): void {
  if (!category) {
    return
  }

  const next = (accumulator[category] ?? 0) + delta
  if (next === 0) {
    delete accumulator[category]
    return
  }

  accumulator[category] = next
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
    if (previous.readState !== "read") {
      delta.unread -= 1
    }
    mergeCategoryDelta(delta.categories, previous.category, -1)
  }

  if (next) {
    delta.total += 1
    if (next.readState !== "read") {
      delta.unread += 1
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

    return acc
  }, createEmptyStatsDelta())
}
