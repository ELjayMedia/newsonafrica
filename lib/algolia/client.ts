export type AlgoliaSortMode = "relevance" | "latest"

export interface AlgoliaSearchRecord {
  objectID?: string
  title?: string
  excerpt?: string
  categories?: string[]
  country?: string
  published_at?: string
}

export interface AlgoliaSearchIndex {
  search<T extends Record<string, unknown> = AlgoliaSearchRecord>(
    query: string,
    options: {
      page: number
      hitsPerPage: number
      attributesToRetrieve?: string[]
    },
  ): Promise<{
    hits: T[]
    nbHits?: number
    nbPages?: number
  }>
}

/**
 * Placeholder implementation that allows the API route to gracefully fall back to WordPress search
 * when Algolia credentials are not configured.
 */
export const resolveSearchIndex = (
  _scope: unknown,
  _sort: AlgoliaSortMode,
): AlgoliaSearchIndex | null => null
