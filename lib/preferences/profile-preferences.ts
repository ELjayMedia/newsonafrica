import type { CommentSortOption } from "@/lib/supabase-schema"
import type { BookmarkSortPreference } from "@/types/user-preferences"

export type RawProfilePreferences = Record<string, unknown>

export type StoredProfilePreferences = {
  comment_sort?: CommentSortOption
  bookmark_sort?: BookmarkSortPreference
  last_subscription_plan?: string | null
}

export function isRecord(value: unknown): value is RawProfilePreferences {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseProfilePreferences(value: unknown): RawProfilePreferences {
  if (isRecord(value)) {
    return { ...value }
  }

  return {}
}

export function extractStoredPreferences(raw: RawProfilePreferences): StoredProfilePreferences {
  const stored: StoredProfilePreferences = {}

  const commentSort = raw.comment_sort
  if (typeof commentSort === "string" && ["newest", "oldest", "popular"].includes(commentSort)) {
    stored.comment_sort = commentSort as CommentSortOption
  }

  const bookmarkSort = raw.bookmark_sort
  if (typeof bookmarkSort === "string" && ["newest", "oldest", "title", "unread"].includes(bookmarkSort)) {
    stored.bookmark_sort = bookmarkSort as BookmarkSortPreference
  }

  const lastPlan = raw.last_subscription_plan
  if (lastPlan === null || typeof lastPlan === "string") {
    stored.last_subscription_plan = lastPlan
  }

  return stored
}

export function sanitizeProfilePreferences(
  value: unknown,
): { raw: RawProfilePreferences; stored: StoredProfilePreferences; didChange: boolean } {
  const parsed = parseProfilePreferences(value)
  const sanitized: RawProfilePreferences = { ...parsed }
  const stored = extractStoredPreferences(parsed)
  let didChange = false

  if (parsed.comment_sort !== undefined && stored.comment_sort === undefined) {
    delete sanitized.comment_sort
    didChange = true
  }

  if (parsed.bookmark_sort !== undefined && stored.bookmark_sort === undefined) {
    delete sanitized.bookmark_sort
    didChange = true
  }

  if (parsed.last_subscription_plan !== undefined && stored.last_subscription_plan === undefined) {
    delete sanitized.last_subscription_plan
    didChange = true
  }

  return { raw: sanitized, stored, didChange }
}
