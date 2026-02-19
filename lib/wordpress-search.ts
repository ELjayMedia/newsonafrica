import { stripHtml } from "@/lib/search"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { POSTS_QUERY } from "@/lib/wordpress/queries"
import {
  fetchWordPressGraphQL,
  type WordPressGraphQLFailure,
  type WordPressGraphQLResult,
  type WordPressGraphQLSuccess,
} from "@/lib/wordpress/client"
import type { WordPressPost } from "@/types/wp"
import type { PostSummaryFieldsFragment } from "@/types/wpgraphql"

const DEFAULT_SITE_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

export type WordPressSearchResult = WordPressPost

export interface SearchResponse {
  results: WordPressSearchResult[]
  total: number
  totalPages: number
  currentPage: number
  hasMore: boolean
  query: string
  searchTime: number
  suggestions?: string[]
}

type SearchPostsQueryResult = {
  posts?: {
    nodes?: (PostSummaryFieldsFragment | null)[] | null
    pageInfo?: {
      hasNextPage?: boolean | null
      offsetPagination?: { total?: number | null } | null
    } | null
  } | null
}

type OrderByOption = "relevance" | "date" | "title"
type OrderDirectionOption = "asc" | "desc"


const isGraphQlFailure = <T>(
  result: WordPressGraphQLResult<T>,
): result is WordPressGraphQLFailure =>
  typeof result === "object" && result !== null && "ok" in result && result.ok === false

const isGraphQlSuccess = <T>(
  result: WordPressGraphQLResult<T>,
): result is WordPressGraphQLSuccess<T> =>
  typeof result === "object" && result !== null && "ok" in result && result.ok === true

const resolveOrderField = (orderBy: OrderByOption): string => {
  switch (orderBy) {
    case "date":
      return "DATE"
    case "title":
      return "TITLE"
    case "relevance":
    default:
      return "SEARCH_RELEVANCE"
  }
}

const resolveOrderDirection = (order: OrderDirectionOption): "ASC" | "DESC" =>
  order === "asc" ? "ASC" : "DESC"

const buildEmptyResponse = (
  query: string,
  page: number,
  perPage: number,
  startTime: number,
): SearchResponse => ({
  results: [],
  total: 0,
  totalPages: 0,
  currentPage: page,
  hasMore: false,
  query,
  searchTime: Date.now() - startTime,
  suggestions: [],
})

const sanitizeTitle = (value?: string | null): string => stripHtml(value ?? "").trim()

export async function searchWordPressPosts(
  query: string,
  options: {
    page?: number
    perPage?: number
    categories?: number[]
    tags?: number[]
    author?: number
    orderBy?: OrderByOption
    order?: OrderDirectionOption
    country?: string
  } = {},
): Promise<SearchResponse> {
  const startTime = Date.now()
  const trimmedQuery = query.trim()
  const page = Math.max(1, options.page ?? 1)
  const perPage = Math.max(1, options.perPage ?? 20)
  const orderBy = options.orderBy ?? "relevance"
  const orderDirection = resolveOrderDirection(options.order ?? "desc")
  const orderField = resolveOrderField(orderBy)
  const country = options.country?.trim().toLowerCase() || DEFAULT_SITE_COUNTRY

  if (!trimmedQuery) {
    return buildEmptyResponse(trimmedQuery, page, perPage, startTime)
  }


  const variables: Record<string, unknown> = {
    first: perPage,
    offset: (page - 1) * perPage,
    search: trimmedQuery,
    orderField,
    orderDirection,
  }

  try {
    const gqlResult = await fetchWordPressGraphQL<SearchPostsQueryResult>(
      country,
      POSTS_QUERY,
      variables as Record<string, string | number | boolean | string[]>,
      { revalidate: CACHE_DURATIONS.NONE },
    )

    if (!isGraphQlSuccess(gqlResult) || !gqlResult.posts) {
      if (isGraphQlFailure(gqlResult)) {
        console.error("WordPress GraphQL search failed", gqlResult.error)
      }
      const fallback = buildEmptyResponse(trimmedQuery, page, perPage, startTime)
      return fallback
    }

    const nodes =
      gqlResult.posts.nodes?.filter((node): node is PostSummaryFieldsFragment => Boolean(node)) ?? []
    const mapped = nodes.map((node) => mapGraphqlPostToWordPressPost(node, country))

    const totalFromGraphql = gqlResult.posts.pageInfo?.offsetPagination?.total
    const total =
      typeof totalFromGraphql === "number" && totalFromGraphql >= 0
        ? totalFromGraphql
        : mapped.length + (page - 1) * perPage
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / perPage)) : 0
    const hasMore =
      typeof gqlResult.posts.pageInfo?.hasNextPage === "boolean"
        ? gqlResult.posts.pageInfo.hasNextPage
        : page < Math.max(1, totalPages)

    const suggestions = Array.from(new Set(mapped.map((post) => sanitizeTitle(post.title)))).slice(0, 10)

    const response: SearchResponse = {
      results: mapped,
      total,
      totalPages,
      currentPage: page,
      hasMore,
      query: trimmedQuery,
      searchTime: Date.now() - startTime,
      suggestions,
    }

    return response
  } catch (error) {
    console.error("WordPress GraphQL search encountered an error", error)
    const fallback = buildEmptyResponse(trimmedQuery, page, perPage, startTime)
    return fallback
  }
}

export async function getSearchSuggestions(
  query: string,
  limit = 8,
  country?: string,
): Promise<string[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  try {
    const response = await searchWordPressPosts(trimmed, {
      page: 1,
      perPage: limit,
      country,
      orderBy: "relevance",
      order: "desc",
    })

    const candidates = response.suggestions && response.suggestions.length > 0
      ? response.suggestions
      : response.results.map((post) => sanitizeTitle(post.title))

    return Array.from(new Set(candidates.filter(Boolean))).slice(0, limit)
  } catch (error) {
    console.error("WordPress GraphQL suggestion lookup failed", error)
    return []
  }
}

/**
 * No-op: process-local search caching has been retired.
 * Search now relies on Next.js fetch cache policy configured in fetchWordPressGraphQL.
 */
export function clearSearchCache(): void {}

export async function searchWordPressPostsAction(
  query: string,
  options: {
    page?: number
    perPage?: number
    categories?: number[]
    tags?: number[]
    author?: number
    orderBy?: OrderByOption
    order?: OrderDirectionOption
    country?: string
  } = {},
): Promise<SearchResponse> {
  "use server"
  return searchWordPressPosts(query, options)
}

export async function getSearchSuggestionsAction(query: string, limit = 8): Promise<string[]> {
  "use server"
  return getSearchSuggestions(query, limit)
}
