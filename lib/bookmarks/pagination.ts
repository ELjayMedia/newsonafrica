import type { BookmarkPagination } from "@/types/bookmarks"

export interface DerivePaginationOptions<T> {
  page: number
  limit: number
  rows: T[]
  cursorEncoder?: (row: T) => string | null
}

export interface PaginationResult<T> {
  items: T[]
  pagination: BookmarkPagination
}

export function derivePagination<T>({
  page,
  limit,
  rows,
  cursorEncoder,
}: DerivePaginationOptions<T>): PaginationResult<T> {
  const safeLimit = Math.max(1, limit)
  const hasMore = rows.length > safeLimit
  const items = hasMore ? rows.slice(0, safeLimit) : rows
  const lastItem = items.length > 0 ? items[items.length - 1] : undefined

  let nextCursor: string | null = null
  if (hasMore && lastItem && cursorEncoder) {
    const encoded = cursorEncoder(lastItem)
    if (encoded) {
      nextCursor = encoded
    }
  }

  return {
    items,
    pagination: {
      page,
      limit: safeLimit,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      nextCursor,
    },
  }
}
