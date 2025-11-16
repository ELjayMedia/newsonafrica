import type { BookmarkListRow } from "@/types/bookmarks"
import type { BookmarkCounterDelta } from "@/lib/bookmarks/counters"
import { collectionKeyForId } from "@/lib/bookmarks/collection-keys"
import { isUnreadReadState } from "@/lib/bookmarks/read-state"
import type { Database } from "@/types/supabase"

export interface BookmarkUpdateInput {
  title?: BookmarkListRow["title"] | null
  slug?: BookmarkListRow["slug"] | null
  excerpt?: BookmarkListRow["excerpt"] | null
  category?: BookmarkListRow["category"] | null
  tags?: BookmarkListRow["tags"] | null
  readState?: BookmarkListRow["readState"] | null
  note?: BookmarkListRow["note"] | null
  featuredImage?: BookmarkListRow["featuredImage"] | null
  editionCode?: BookmarkListRow["editionCode"] | null
  collectionId?: BookmarkListRow["collectionId"] | null
}

export interface BookmarkUpdatePreparation {
  dbUpdates: Database["public"]["Tables"]["bookmarks"]["Update"]
  targetEditionCode: string | null
  targetCollectionId: string | null
  shouldResolveCollection: boolean
  hasWritableUpdate: boolean
}

function isBookmarkUnread(row: Pick<BookmarkListRow, "readState">): boolean {
  return isUnreadReadState(row.readState)
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

export function prepareBookmarkUpdatePayload(
  existing: BookmarkListRow,
  updates: BookmarkUpdateInput,
): BookmarkUpdatePreparation {
  const dbUpdates: Database["public"]["Tables"]["bookmarks"]["Update"] = {}
  let targetEditionCode = existing.editionCode ?? null
  let targetCollectionId = existing.collectionId ?? null
  let shouldResolveCollection = false
  let hasWritableUpdate = false

  const assignField = <K extends keyof BookmarkUpdateInput>(
    key: K,
    setter: (value: BookmarkUpdateInput[K]) => void,
  ) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      setter(updates[key])
      hasWritableUpdate = true
    }
  }

  assignField("editionCode", (value) => {
    targetEditionCode = value ?? null
    dbUpdates.edition_code = targetEditionCode
    shouldResolveCollection = true
  })

  assignField("title", (value) => {
    dbUpdates.title = value ?? null
  })

  assignField("slug", (value) => {
    dbUpdates.slug = value ?? null
  })

  assignField("excerpt", (value) => {
    dbUpdates.excerpt = value ?? null
  })

  assignField("category", (value) => {
    dbUpdates.category = value ?? null
  })

  assignField("tags", (value) => {
    dbUpdates.tags = value ?? null
  })

  assignField("readState", (value) => {
    dbUpdates.read_state = value ?? null
  })

  assignField("note", (value) => {
    dbUpdates.note = value ?? null
  })

  assignField("featuredImage", (value) => {
    dbUpdates.featured_image = value && typeof value === "object" ? value : null
  })

  assignField("collectionId", (value) => {
    targetCollectionId = value ?? null
    shouldResolveCollection = true
  })

  return {
    dbUpdates,
    targetEditionCode,
    targetCollectionId,
    shouldResolveCollection,
    hasWritableUpdate,
  }
}
