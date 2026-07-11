/**
 * Article revision helpers (NOA-139).
 *
 * WordPress bumps a post's `modified` timestamp on *any* save — including a
 * one-character typo fix — so `updatedAt !== publishedAt` is far too noisy to
 * drive a reader-facing "Updated" line. We only surface it once the gap is big
 * enough to plausibly represent a substantive post-publication change. This
 * mirrors the machine-readable `dateModified` we already emit in the article's
 * NewsArticle JSON-LD, just gated for human display.
 */

/** Minimum published→modified gap before we show a reader-facing "Updated" line. */
export const MIN_MEANINGFUL_UPDATE_MS = 60 * 60 * 1000; // 1 hour

export function shouldShowUpdatedTimestamp(
  publishedAt: string,
  updatedAt: string,
  minGapMs: number = MIN_MEANINGFUL_UPDATE_MS,
): boolean {
  if (!publishedAt || !updatedAt) return false;

  const published = Date.parse(publishedAt);
  const updated = Date.parse(updatedAt);
  if (Number.isNaN(published) || Number.isNaN(updated)) return false;

  return updated - published >= minGapMs;
}
