import type { BookmarkListRow } from "@/types/bookmarks"
import type { BookmarkCounterDelta } from "@/lib/bookmarks/counters"
import { collectionKeyForId } from "@/lib/bookmarks/counters"

function isBookmarkUnread(row: Pick<BookmarkListRow, "readState">): boolean {
  return !row.readState || row.readState !== "read"
}

export function buildAdditionCounterDelta(row: BookmarkListRow): BookmarkCounterDelta {
  const delta: BookmarkCounterDelta = { total: 1 }
  if (isBookmarkUnread(row)) {
    const key = collectionKeyForId(row.collectionId ?? null)
    delta.unread = 1
    delta.collectionUnread = { [key]: 1 }
  }
  return delta
}

export function buildRemovalCounterDelta(rows: BookmarkListRow[]): BookmarkCounterDelta | null {
  if (!rows.length) {
    return null
  }

  const delta: BookmarkCounterDelta = { total: -rows.length }
  let unreadDelta = 0
  const collectionDelta: Record<string, number> = {}

  for (const row of rows) {
    if (!isBookmarkUnread(row)) continue
    unreadDelta -= 1
    const key = collectionKeyForId(row.collectionId ?? null)
    collectionDelta[key] = (collectionDelta[key] ?? 0) - 1
    if (collectionDelta[key] === 0) {
      delete collectionDelta[key]
    }
  }

  if (unreadDelta) {
    delta.unread = unreadDelta
  }
  if (Object.keys(collectionDelta).length) {
    delta.collectionUnread = collectionDelta
  }

  return delta
}

export function buildUpdateCounterDelta(
  previous: BookmarkListRow,
  next: BookmarkListRow,
): BookmarkCounterDelta | null {
  const wasUnread = isBookmarkUnread(previous)
  const isUnreadNow = isBookmarkUnread(next)
  const collectionDelta: Record<string, number> = {}
  let unreadDelta = 0

  if (wasUnread && !isUnreadNow) {
    unreadDelta -= 1
  } else if (!wasUnread && isUnreadNow) {
    unreadDelta += 1
  }

  if (wasUnread) {
    const key = collectionKeyForId(previous.collectionId ?? null)
    collectionDelta[key] = (collectionDelta[key] ?? 0) - 1
    if (collectionDelta[key] === 0) {
      delete collectionDelta[key]
    }
  }

  if (isUnreadNow) {
    const key = collectionKeyForId(next.collectionId ?? null)
    collectionDelta[key] = (collectionDelta[key] ?? 0) + 1
    if (collectionDelta[key] === 0) {
      delete collectionDelta[key]
    }
  }

  const hasCollectionDelta = Object.keys(collectionDelta).length > 0
  if (!unreadDelta && !hasCollectionDelta) {
    return null
  }

  const delta: BookmarkCounterDelta = {}
  if (unreadDelta) {
    delta.unread = unreadDelta
  }
  if (hasCollectionDelta) {
    delta.collectionUnread = collectionDelta
  }
  return delta
}
