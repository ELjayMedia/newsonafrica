/**
 * Normalize a WordPress post ID to a positive integer (NOA-13).
 *
 * WordPress post IDs are the stable `(edition_code, wp_post_id)` join key
 * across `content_index`, `bookmarks` and `comments` (all `bigint`). They enter
 * the app as GraphQL `databaseId` (already numeric) and, at the webhook
 * boundary, as untyped JSON that may be a number OR a numeric string. This
 * centralizes the string→number normalization so no code path inserts or
 * queries a stringly-typed ID.
 *
 * @returns the positive integer ID, or `null` for anything that isn't one
 *   (non-numeric strings, `0`, negatives, floats, `NaN`, nullish).
 */
export function normalizeWpPostId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}
