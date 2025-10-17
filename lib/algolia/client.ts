type SearchScope = { type: "country"; country: string } | { type: "panAfrican" }

export type AlgoliaSortMode = "relevance" | "latest"

export interface AlgoliaSearchRecord {
  objectID: string
  title: string
  excerpt: string
  categories: string[]
  country: string
  published_at?: string
}

interface AlgoliaSearchResult<T> {
  hits: T[]
  nbHits: number
  nbPages: number
}

interface AlgoliaIndex {
  search<T>(
    query: string,
    options: { page: number; hitsPerPage: number; attributesToRetrieve?: string[] },
  ): Promise<AlgoliaSearchResult<T>>
}

export const resolveSearchIndex = (
  _scope: SearchScope,
  _sort: AlgoliaSortMode,
): AlgoliaIndex | null => {
  return null
}

