import type { BookmarkReadState } from "@/types/bookmarks"
import type { BookmarkUpdateInput } from "@/lib/bookmarks/mutations"

const DIRECT_PAYLOAD_KEYS = ["payload", "bookmark", "input", "data"] as const
const WRAPPED_PAYLOAD_KEYS = ["action", "mutation", "event"] as const
const ARRAY_PAYLOAD_KEYS = ["args", "arguments", "values"] as const
const MAX_PAYLOAD_DEPTH = 5

const READ_STATE_VALUES: readonly BookmarkReadState[] = ["unread", "in_progress", "read"]
const READ_STATE_SET = new Set<BookmarkReadState>(READ_STATE_VALUES)

export const SORTABLE_COLUMNS = {
  created_at: { alias: "createdAt" },
  title: { alias: "title" },
  read_state: { alias: "readState" },
  wp_post_id: { alias: "postId" },
  edition_code: { alias: "editionCode" },
  collection_id: { alias: "collectionId" },
} as const

export type SortColumn = keyof typeof SORTABLE_COLUMNS

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractPayloadFromArray(value: unknown, depth: number): Record<string, unknown> | null {
  if (!Array.isArray(value) || depth >= MAX_PAYLOAD_DEPTH) {
    return null
  }

  for (const entry of value) {
    if (isPlainRecord(entry)) {
      const nested = extractPayloadFromRecord(entry, depth + 1)
      return nested ?? entry
    }
  }

  return null
}

function extractPayloadFromRecord(
  record: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> | null {
  if (depth >= MAX_PAYLOAD_DEPTH) {
    return null
  }

  for (const key of DIRECT_PAYLOAD_KEYS) {
    const nested = record[key]
    if (isPlainRecord(nested)) {
      const result = extractPayloadFromRecord(nested, depth + 1)
      return result ?? nested
    }
  }

  for (const key of ARRAY_PAYLOAD_KEYS) {
    const nested = extractPayloadFromArray(record[key], depth + 1)
    if (nested) {
      return nested
    }
  }

  for (const wrapper of WRAPPED_PAYLOAD_KEYS) {
    const nested = record[wrapper]
    if (isPlainRecord(nested)) {
      const result = extractPayloadFromRecord(nested, depth + 1)
      if (result) {
        return result
      }
    }
  }

  return null
}

export function extractMutationPayload(body: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(body)) {
    return null
  }

  const nested = extractPayloadFromRecord(body)
  return nested ?? body
}

export function sanitizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const filtered = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)

  return filtered.length ? filtered : null
}

export function sanitizeFeaturedImage(value: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(value)) {
    return null
  }

  return value
}

export function sanitizeEditionCode(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed.length) {
      return null
    }

    const normalized = trimmed.toLowerCase()
    if (normalized === "null") {
      return null
    }

    return normalized
  }

  if (value === null) {
    return null
  }

  return undefined
}

export function sanitizeCollectionId(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed.length || trimmed.toLowerCase() === "null") {
      return null
    }

    return trimmed
  }

  if (value === null) {
    return null
  }

  return undefined
}

export function sanitizeNoteValue(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    return value
  }

  if (value === null) {
    return null
  }

  return undefined
}

export function sanitizeReadState(value: unknown): BookmarkReadState | null | undefined {
  if (typeof value === "string") {
    const normalizedRaw = value
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")

    if (normalizedRaw === "null") {
      return null
    }

    const normalized = normalizedRaw as BookmarkReadState
    if (READ_STATE_SET.has(normalized)) {
      return normalized
    }

    return undefined
  }

  if (value === null) {
    return null
  }

  return undefined
}

function sanitizeNullableString(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    return value
  }

  if (value === null) {
    return null
  }

  return undefined
}

export function sanitizeNullableCategory(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }

  if (value === null) {
    return null
  }

  return undefined
}

export function resolveSortColumn(value: string | null): SortColumn {
  if (value && value in SORTABLE_COLUMNS) {
    return value as SortColumn
  }

  return "created_at"
}

export function buildBookmarkUpdateInput(raw: unknown): BookmarkUpdateInput | null {
  if (!isPlainRecord(raw)) {
    return null
  }

  const updates: BookmarkUpdateInput = {}
  const assign = <K extends keyof BookmarkUpdateInput>(key: K, value: BookmarkUpdateInput[K] | undefined) => {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  assign("title", sanitizeNullableString(raw.title))
  assign("slug", sanitizeNullableString(raw.slug))
  assign("excerpt", sanitizeNullableString(raw.excerpt))
  assign("category", sanitizeNullableCategory(raw.category))

  if (Object.prototype.hasOwnProperty.call(raw, "tags")) {
    assign("tags", sanitizeStringArray(raw.tags))
  }

  const readStateValue = sanitizeReadState(raw.readState ?? raw.status)
  assign("readState", readStateValue)

  const noteValue = sanitizeNoteValue(raw.note ?? raw.notes)
  assign("note", noteValue)

  if (Object.prototype.hasOwnProperty.call(raw, "featuredImage")) {
    assign("featuredImage", sanitizeFeaturedImage(raw.featuredImage))
  }

  const editionValue = sanitizeEditionCode(raw.editionCode ?? raw.country)
  assign("editionCode", editionValue)

  const collectionValue = sanitizeCollectionId(raw.collectionId)
  assign("collectionId", collectionValue)

  return updates
}
