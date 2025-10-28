import type { CommentSortOption } from "@/lib/supabase-schema"

export type CommentCursor =
  | {
      sort: "newest" | "oldest"
      createdAt: string
      id: string
    }
  | {
      sort: "popular"
      createdAt: string
      id: string
      reactionCount: number | null
    }

function sanitizePart(part: string): string {
  return encodeURIComponent(part)
}

export function encodeCommentCursor(cursor: CommentCursor): string {
  const parts: string[] = [cursor.sort]

  if (cursor.sort === "popular") {
    const reactionPart = cursor.reactionCount == null ? "null" : String(cursor.reactionCount)
    parts.push(reactionPart, cursor.createdAt, cursor.id)
  } else {
    parts.push(cursor.createdAt, cursor.id)
  }

  return parts.map(sanitizePart).join("|")
}

export function decodeCommentCursor(value: string | null | undefined): CommentCursor | null {
  if (!value) return null

  try {
    const parts = value.split("|").map((part) => decodeURIComponent(part))
    if (parts.length < 3) {
      return null
    }

    const sort = parts[0] as CommentSortOption

    if (sort === "newest" || sort === "oldest") {
      return {
        sort,
        createdAt: parts[1],
        id: parts[2],
      }
    }

    if (sort === "popular") {
      if (parts.length < 4) {
        return null
      }

      const reactionPart = parts[1]
      const reactionCount = reactionPart === "null" ? null : Number.parseFloat(reactionPart)

      if (reactionPart !== "null" && Number.isNaN(reactionCount)) {
        return null
      }

      return {
        sort,
        reactionCount,
        createdAt: parts[2],
        id: parts[3],
      }
    }

    return null
  } catch {
    return null
  }
}

export function buildCursorConditions(
  sort: CommentSortOption,
  cursor: CommentCursor | null,
): string[] {
  if (!cursor || cursor.sort !== sort) {
    return []
  }

  switch (sort) {
    case "newest":
      return [
        `created_at.lt.${cursor.createdAt}`,
        `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      ]
    case "oldest":
      return [
        `created_at.gt.${cursor.createdAt}`,
        `and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
      ]
    case "popular": {
      if (cursor.reactionCount == null) {
        return [
          `and(reaction_count.is.null,created_at.lt.${cursor.createdAt})`,
          `and(reaction_count.is.null,created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        ]
      }

      return [
        `reaction_count.lt.${cursor.reactionCount}`,
        `and(reaction_count.eq.${cursor.reactionCount},created_at.lt.${cursor.createdAt})`,
        `and(reaction_count.eq.${cursor.reactionCount},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      ]
    }
    default:
      return []
  }
}
