import algoliasearch, { type SearchClient, type SearchIndex } from "algoliasearch"

export type AlgoliaSortMode = "relevance" | "latest"

export interface AlgoliaSearchRecord {
  objectID: string
  title: string
  excerpt: string
  categories: string[]
  country: string
  published_at: string
}

type IndexScope =
  | { type: "country"; country: string }
  | { type: "panAfrican" }

interface IndexHandles {
  base: SearchIndex<AlgoliaSearchRecord>
  latest: SearchIndex<AlgoliaSearchRecord>
  relevance: SearchIndex<AlgoliaSearchRecord>
}

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY
const ALGOLIA_SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY || process.env.ALGOLIA_ADMIN_KEY
export const ALGOLIA_INDEX_PREFIX = process.env.ALGOLIA_INDEX_PREFIX || "newsonafrica"

function createClient(apiKey?: string | null): SearchClient | null {
  if (!ALGOLIA_APP_ID || !apiKey) {
    return null
  }

  return algoliasearch(ALGOLIA_APP_ID, apiKey)
}

export const algoliaAdminClient = createClient(ALGOLIA_ADMIN_KEY)
export const algoliaSearchClient = createClient(ALGOLIA_SEARCH_KEY)

const buildBaseIndexName = (scope: IndexScope): string => {
  if (scope.type === "country") {
    return `${ALGOLIA_INDEX_PREFIX}_${scope.country}`
  }

  return `${ALGOLIA_INDEX_PREFIX}_africa`
}

const buildReplicaIndexName = (base: string, variant: AlgoliaSortMode): string => `${base}_${variant}`

const createHandles = (client: SearchClient, scope: IndexScope): IndexHandles => {
  const baseName = buildBaseIndexName(scope)

  return {
    base: client.initIndex<AlgoliaSearchRecord>(baseName),
    latest: client.initIndex<AlgoliaSearchRecord>(buildReplicaIndexName(baseName, "latest")),
    relevance: client.initIndex<AlgoliaSearchRecord>(buildReplicaIndexName(baseName, "relevance")),
  }
}

export const getAdminIndexHandles = (scope: IndexScope): IndexHandles | null => {
  if (!algoliaAdminClient) {
    return null
  }

  return createHandles(algoliaAdminClient, scope)
}

export const getSearchIndexHandles = (scope: IndexScope): IndexHandles | null => {
  if (!algoliaSearchClient) {
    return null
  }

  return createHandles(algoliaSearchClient, scope)
}

export const resolveSearchIndex = (
  scope: IndexScope,
  sort: AlgoliaSortMode,
): SearchIndex<AlgoliaSearchRecord> | null => {
  const handles = getSearchIndexHandles(scope)
  if (!handles) {
    return null
  }

  if (sort === "latest") {
    return handles.latest
  }

  return handles.relevance
}

export const resolveAdminIndex = (
  scope: IndexScope,
  sort: AlgoliaSortMode = "relevance",
): SearchIndex<AlgoliaSearchRecord> | null => {
  const handles = getAdminIndexHandles(scope)
  if (!handles) {
    return null
  }

  if (sort === "latest") {
    return handles.latest
  }

  if (sort === "relevance") {
    return handles.relevance
  }

  return handles.base
}

export type { IndexHandles, IndexScope }
