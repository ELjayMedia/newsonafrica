import Link from "next/link";

import { buildPageRange, ELLIPSIS } from "@/lib/pagination-range";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Route path without query string, e.g. `/za/category/politics`. */
  basePath: string;
  page: number;
  totalPages: number;
  /** Extra query params to preserve on every page link (e.g. `q`/`country` on `/search`, NOA-94). */
  extraParams?: Record<string, string>;
}

function hrefForPage(basePath: string, page: number, extraParams?: Record<string, string>): string {
  const params = new URLSearchParams(extraParams);
  if (page > 1) params.set("page", String(page));
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

const PAGE_LINK_CLASS =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-3 ui-sm transition-colors md:h-9 md:min-w-9";

/** Page-number pagination control for category/tag/author listings (NOA-91) and search results (NOA-94). */
export function Pagination({ basePath, page, totalPages, extraParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPageRange(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5 pt-8">
      <Link
        href={hrefForPage(basePath, Math.max(1, page - 1), extraParams)}
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? undefined : -1}
        className={cn(
          PAGE_LINK_CLASS,
          "border-input",
          hasPrev ? "hover:bg-accent hover:text-accent-foreground" : "pointer-events-none opacity-40",
        )}
      >
        Previous
      </Link>

      {items.map((item, index) =>
        item === ELLIPSIS ? (
          <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground" aria-hidden>
            {ELLIPSIS}
          </span>
        ) : (
          <Link
            key={item}
            href={hrefForPage(basePath, item, extraParams)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              PAGE_LINK_CLASS,
              item === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={hrefForPage(basePath, Math.min(totalPages, page + 1), extraParams)}
        aria-disabled={!hasNext}
        tabIndex={hasNext ? undefined : -1}
        className={cn(
          PAGE_LINK_CLASS,
          "border-input",
          hasNext ? "hover:bg-accent hover:text-accent-foreground" : "pointer-events-none opacity-40",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
