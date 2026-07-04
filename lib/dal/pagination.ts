/**
 * Pagination helpers (NOA-86) — pure functions, unit tested separately from
 * any network call.
 */
import type { WPRestPageInfo } from "@/lib/wordpress/types";
import type { PaginatedResult } from "@/lib/dal/types";

export const DEFAULT_PER_PAGE = 10;
export const MAX_PER_PAGE = 100;

/** Clamp a caller-supplied page number to a sane positive integer. */
export function normalizePage(page: number | undefined): number {
  if (!page || !Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

/** Clamp a caller-supplied page size to WordPress's [1, 100] REST limit. */
export function normalizePerPage(perPage: number | undefined): number {
  if (!perPage || !Number.isFinite(perPage) || perPage < 1) return DEFAULT_PER_PAGE;
  return Math.min(Math.floor(perPage), MAX_PER_PAGE);
}

export function buildPaginatedResult<T>(
  items: T[],
  page: number,
  perPage: number,
  pageInfo: WPRestPageInfo,
): PaginatedResult<T> {
  const total = pageInfo.total;
  const totalPages = pageInfo.totalPages || (total > 0 ? Math.ceil(total / perPage) : items.length > 0 ? 1 : 0);

  return {
    items,
    page,
    perPage,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };
}
