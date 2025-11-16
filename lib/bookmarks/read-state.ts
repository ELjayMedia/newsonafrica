import type { BookmarkReadState, BookmarkReadStateKey } from "@/types/bookmarks"

export function resolveReadStateKey(
  state: BookmarkReadState | null | undefined,
): BookmarkReadStateKey {
  return (state ?? "unknown") as BookmarkReadStateKey
}

export function isUnreadReadState(state: BookmarkReadState | null | undefined): boolean {
  return resolveReadStateKey(state) !== "read"
}

export function isUnreadReadStateKey(state: BookmarkReadStateKey): boolean {
  return state !== "read"
}
