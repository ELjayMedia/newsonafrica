/**
 * Keyset (cursor) pagination for comment threads (NOA-101), ported from
 * `legacy/lib/comment-cursor.ts`. A cursor pins the position of the last
 * top-level comment on the previous page by (created_at, id) — stable under
 * concurrent inserts, unlike OFFSET. The "popular" sort from the legacy app
 * is dropped (no comment reactions in the rebuild).
 *
 * Pure and dependency-free so it unit-tests without Supabase.
 */

export type CommentSort = "newest" | "oldest";

export interface CommentCursor {
  sort: CommentSort;
  /** ISO timestamp of the last row on the previous page. */
  createdAt: string;
  /** UUID tiebreaker for rows sharing a created_at. */
  id: string;
}

const SORTS: readonly CommentSort[] = ["newest", "oldest"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCommentSort(value: string): value is CommentSort {
  return (SORTS as readonly string[]).includes(value);
}

/** Opaque, URL-safe encoding: `sort|createdAt|id` with each part URI-encoded. */
export function encodeCommentCursor(cursor: CommentCursor): string {
  return [cursor.sort, cursor.createdAt, cursor.id].map(encodeURIComponent).join("|");
}

/**
 * Decodes a cursor from a query param. Returns null for anything malformed —
 * callers treat that as "first page" rather than erroring.
 */
export function decodeCommentCursor(value: string | null | undefined): CommentCursor | null {
  if (!value) return null;

  try {
    const parts = value.split("|").map(decodeURIComponent);
    if (parts.length !== 3) return null;

    const [sort, createdAt, id] = parts;
    if (sort === undefined || createdAt === undefined || id === undefined) return null;
    if (!isCommentSort(sort)) return null;
    if (createdAt.length === 0 || Number.isNaN(Date.parse(createdAt))) return null;
    if (!UUID_RE.test(id)) return null;

    return { sort, createdAt, id };
  } catch {
    return null;
  }
}

/**
 * PostgREST `or=(...)` disjuncts implementing keyset pagination:
 * rows strictly after the cursor in the given sort order, with `id` breaking
 * created_at ties. Apply via `query.or(conditions.join(","))`.
 *
 * A cursor produced under a different sort is ignored (returns []) so a
 * stale link degrades to page one of the requested sort.
 */
export function buildCursorConditions(sort: CommentSort, cursor: CommentCursor | null): string[] {
  if (!cursor || cursor.sort !== sort) return [];

  if (sort === "newest") {
    return [
      `created_at.lt.${cursor.createdAt}`,
      `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    ];
  }

  return [
    `created_at.gt.${cursor.createdAt}`,
    `and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
  ];
}
