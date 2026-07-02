/**
 * Pure helper for the `Pagination` control (NOA-91): builds a compact page
 * number sequence with "…" ellipses so wide result sets don't render a page
 * link per page. Split out from the component so it's unit-testable without
 * React.
 */
export const ELLIPSIS = "…" as const;
export type PageRangeItem = number | typeof ELLIPSIS;

/**
 * Build the page numbers to render around `current`, always including the
 * first and last page. `siblings` controls how many pages are shown on each
 * side of the current page before collapsing into an ellipsis.
 */
export function buildPageRange(current: number, total: number, siblings = 1): PageRangeItem[] {
  if (total <= 0) return [];
  if (total <= 5 + siblings * 2) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);

  const range: PageRangeItem[] = [1];

  if (start > 2) range.push(ELLIPSIS);
  for (let page = start; page <= end; page += 1) range.push(page);
  if (end < total - 1) range.push(ELLIPSIS);

  range.push(total);
  return range;
}
