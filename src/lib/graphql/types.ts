export interface CursorPageInfo {
  hasNextPage: boolean
  endCursor: string | null
}

export interface CursorPaginatedNodes<TNode> {
  nodes: TNode[]
  pageInfo: CursorPageInfo
}

type Nullable<T> = T | null | undefined

type ConnectionPageInfo = {
  hasNextPage?: boolean | null
  endCursor?: string | null
}

type ConnectionLike<TNode> = {
  nodes?: Nullable<TNode>[] | null
  pageInfo?: ConnectionPageInfo | null
}

export const EMPTY_CURSOR_PAGE_INFO: CursorPageInfo = {
  hasNextPage: false,
  endCursor: null,
}

export function normalizeCursorPageInfo(pageInfo?: ConnectionPageInfo | null): CursorPageInfo {
  return {
    hasNextPage: pageInfo?.hasNextPage ?? false,
    endCursor: pageInfo?.endCursor ?? null,
  }
}

export function normalizeCursorConnection<TNode>(
  connection?: ConnectionLike<TNode> | null,
): CursorPaginatedNodes<TNode> {
  return {
    nodes: connection?.nodes?.filter((node): node is TNode => Boolean(node)) ?? [],
    pageInfo: normalizeCursorPageInfo(connection?.pageInfo),
  }
}
