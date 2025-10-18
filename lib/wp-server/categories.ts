import "server-only"

import { cache } from "react"

import { CACHE_DURATIONS } from "../cache/constants"
import {
  CATEGORY_POSTS_BATCH_QUERY,
  CATEGORY_POSTS_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  WORDPRESS_REST_MAX_PER_PAGE,
  wordpressQueries,
} from "../wordpress-queries"
import { executeRestFallback, fetchFromWp, fetchFromWpGraphQL } from "../wordpress/client"
import type { WordPressPost } from "@/types/wp"
import { mapWordPressPostFromSource } from "@/lib/mapping/post-mappers"
import { DEFAULT_COUNTRY, FP_TAG_SLUG } from "../wordpress/shared"
import type {
  CategoryPostsResult,
  WordPressCategory,
  WordPressPost,
  WordPressTag,
} from "@/types/wp"
import type {
  CategoryPostsBatchQuery,
  CategoryPostsQuery,
  CategoriesQuery,
  PostsByCategoryQuery,
} from "@/types/wpgraphql"
import {
  buildWpCacheTags,
  graphqlFirst,
  paginateRest,
  type RestPaginationResult,
} from "./common"

const REST_CATEGORY_CACHE_TTL_MS = CACHE_DURATIONS.SHORT * 1000

export interface WordPressCategoryTreeNode extends WordPressCategory {
  children: WordPressCategoryTreeNode[]
}

const CATEGORY_TREE_CACHE_EXTRA = "tree"

const normalizeCountryCode = (value: string | null | undefined): string => {
  if (typeof value !== "string") {
    return DEFAULT_COUNTRY
  }

  const trimmed = value.trim().toLowerCase()
  return trimmed || DEFAULT_COUNTRY
}

const mapCategoryTreeNodeFromRest = (payload: any): WordPressCategoryTreeNode => {
  const mapped = mapCategoryFromRest(payload)

  return {
    ...mapped,
    parent: typeof mapped.parent === "number" ? mapped.parent : null,
    children: [],
  }
}

const cloneCategoryTree = (
  nodes: WordPressCategoryTreeNode[],
): WordPressCategoryTreeNode[] =>
  nodes.map((node) => ({
    ...node,
    children: cloneCategoryTree(node.children),
  }))

interface CachedCategoryPosts {
  posts: WordPressPost[]
  hasMore: boolean
  expiresAt: number
}

const restCategoryPostsCache = new Map<string, CachedCategoryPosts>()

const buildCategoryCacheKey = (
  countryCode: string,
  categoryId: number | string,
  limit: number,
  tagId?: number | string,
) => `${countryCode}:${categoryId}:${limit}:${tagId ?? "all"}`

const createEmptyResult = (): CategoryPostsResult => ({
  category: null,
  posts: [],
  hasNextPage: false,
  endCursor: null,
})

const normalizeSlug = (slug: string | null | undefined) => slug?.trim().toLowerCase() ?? ""

type GraphqlCategoryNode = {
  databaseId?: number | null
  name?: string | null
  slug?: string | null
  description?: string | null
  count?: number | null
}

const mapCategoryFromGraphql = (node: GraphqlCategoryNode | null | undefined): WordPressCategory => ({
  id: node?.databaseId ?? 0,
  name: node?.name ?? "",
  slug: node?.slug ?? "",
  description: node?.description ?? undefined,
  count: node?.count ?? undefined,
})

const mapCategoryFromRest = (payload: any): WordPressCategory => {
  const rawId = payload?.id ?? payload?.databaseId
  const numericId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string"
        ? Number.parseInt(rawId, 10)
        : undefined

  const rawParent = payload?.parent ?? payload?.parentId ?? payload?.parent_id
  const numericParent =
    typeof rawParent === "number"
      ? rawParent
      : typeof rawParent === "string"
        ? Number.parseInt(rawParent, 10)
        : undefined

  return {
    id: Number.isFinite(numericId) && typeof numericId === "number" ? numericId : 0,
    name: payload?.name ?? "",
    slug: payload?.slug ?? "",
    description: payload?.description ?? undefined,
    count: typeof payload?.count === "number" ? payload.count : undefined,
    parent:
      Number.isFinite(numericParent) && typeof numericParent === "number"
        ? numericParent
        : null,
  }
}

const ensureResultEntries = (
  results: Record<string, CategoryPostsResult>,
  slugs: string[],
): Record<string, CategoryPostsResult> => {
  for (const slug of slugs) {
    if (!results[slug]) {
      results[slug] = createEmptyResult()
    }
  }

  return results
}

const fetchCategoryPostsRest = async (
  countryCode: string,
  category: WordPressCategory,
  limit: number,
  cacheTags: string[],
  options: { tagId?: number | string } = {},
): Promise<RestPaginationResult<WordPressPost>> => {
  if (!category?.id || limit <= 0) {
    return { items: [], hasMore: false, pagesFetched: 0 }
  }

  const cacheKey = buildCategoryCacheKey(countryCode, category.id, limit, options.tagId)
  const cached = restCategoryPostsCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return {
      items: cached.posts.slice(0, limit),
      hasMore: cached.hasMore,
      pagesFetched: 0,
    }
  }

  try {
    const pagination = await paginateRest<WordPressPost>({
      limit,
      pageSize: Math.min(limit, WORDPRESS_REST_MAX_PER_PAGE),
      makeRequest: async (page, perPage) => {
        const { endpoint, params } = wordpressQueries.postsByCategory(category.id, perPage, options)
        const response = await executeRestFallback(
          () =>
            fetchFromWp<WordPressPost[]>(
              countryCode,
              { endpoint, params: { ...params, page } },
              { withHeaders: true, tags: cacheTags },
            ),
          `[v1] Category REST fallback failed for ${String(category.slug)} (${countryCode})`,
          { countryCode, categoryId: category.id, page, perPage, tagId: options.tagId },
          { fallbackValue: { data: [] as WordPressPost[], headers: new Headers() } },
        )

        return { items: response.data, headers: response.headers }
      },
    })

    restCategoryPostsCache.set(cacheKey, {
      posts: pagination.items,
      hasMore: pagination.hasMore,
      expiresAt: Date.now() + REST_CATEGORY_CACHE_TTL_MS,
    })

    return pagination
  } catch (error) {
    console.error(`[v1] Failed to fetch posts for category ${String(category.slug)}:`, error)
    restCategoryPostsCache.delete(cacheKey)
    return { items: [], hasMore: false, pagesFetched: 0 }
  }
}

const fetchRestCategoriesBySlugs = async (
  countryCode: string,
  slugs: string[],
  cacheTags: string[],
): Promise<Map<string, WordPressCategory>> => {
  if (slugs.length === 0) {
    return new Map()
  }

  const categories = await executeRestFallback(
    () =>
      fetchFromWp<WordPressCategory[]>(
        countryCode,
        wordpressQueries.categoriesBySlugs(slugs),
        { tags: cacheTags },
      ),
    `[v1] Categories REST fallback failed for ${countryCode}`,
    { countryCode, slugs },
    { fallbackValue: [] },
  )

  const map = new Map<string, WordPressCategory>()
  for (const category of categories ?? []) {
    const slug = normalizeSlug(category?.slug)
    if (slug) {
      map.set(slug, mapCategoryFromRest(category))
    }
  }

  return map
}

async function fetchAllCategoriesUncached(
  countryCode: string,
): Promise<WordPressCategoryTreeNode[]> {
  const normalizedCountry = normalizeCountryCode(countryCode)
  const cacheTags = buildWpCacheTags({
    country: normalizedCountry,
    section: "categories",
    extra: [CATEGORY_TREE_CACHE_EXTRA],
  })

  const { endpoint, params } = wordpressQueries.categories()

  const pagination = await paginateRest<any>({
    limit: Number.MAX_SAFE_INTEGER,
    pageSize: WORDPRESS_REST_MAX_PER_PAGE,
    makeRequest: async (page, perPage) => {
      const response = await executeRestFallback(
        () =>
          fetchFromWp<any[]>(
            normalizedCountry,
            {
              endpoint,
              params: {
                ...params,
                page,
                per_page: perPage,
              },
            },
            { withHeaders: true, tags: cacheTags },
          ),
        `[v1] Category tree REST fallback failed for ${normalizedCountry}`,
        { countryCode: normalizedCountry, page, perPage },
        { fallbackValue: { data: [] as any[], headers: new Headers() } },
      )

      const items = Array.isArray(response.data) ? response.data : []

      return {
        items,
        headers: response.headers,
      }
    },
  })

  const nodesById = new Map<number, WordPressCategoryTreeNode>()
  const orderedNodes: WordPressCategoryTreeNode[] = []

  for (const payload of pagination.items ?? []) {
    const mapped = mapCategoryTreeNodeFromRest(payload)

    if (!mapped.id || mapped.id <= 0) {
      continue
    }

    const existing = nodesById.get(mapped.id)
    if (existing) {
      existing.name = mapped.name
      existing.slug = mapped.slug
      existing.description = mapped.description
      existing.count = mapped.count
      existing.parent = mapped.parent
      continue
    }

    nodesById.set(mapped.id, mapped)
    orderedNodes.push(mapped)
  }

  const roots: WordPressCategoryTreeNode[] = []

  for (const node of orderedNodes) {
    const parentId = typeof node.parent === "number" ? node.parent : null
    if (parentId && parentId > 0) {
      const parent = nodesById.get(parentId)
      if (parent) {
        parent.children.push(node)
        continue
      }
    }

    roots.push(node)
  }

  return roots
}

const getAllCategoriesCached = cache(
  async (countryCode: string): Promise<WordPressCategoryTreeNode[]> => {
    return fetchAllCategoriesUncached(countryCode)
  },
)

export async function getAllCategories(
  countryCode: string,
): Promise<WordPressCategoryTreeNode[]> {
  const normalizedCountry = normalizeCountryCode(countryCode)
  const tree = await getAllCategoriesCached(normalizedCountry)
  return cloneCategoryTree(tree)
}

export async function getPostsForCategories(
  countryCode: string,
  categorySlugs: string[],
  limit = 20,
): Promise<Record<string, CategoryPostsResult>> {
  const normalizedSlugs = Array.from(
    new Set(
      categorySlugs
        .map((slug) => normalizeSlug(slug))
        .filter((slug): slug is string => Boolean(slug)),
    ),
  )

  if (normalizedSlugs.length === 0) {
    return {}
  }

  const tags = buildWpCacheTags({
    country: countryCode,
    section: "categories",
    extra: normalizedSlugs.map((slug) => `category:${slug}`),
  })

  const results = await graphqlFirst<CategoryPostsBatchQuery, Record<string, CategoryPostsResult>>({
    fetchGraphql: () =>
      fetchFromWpGraphQL<CategoryPostsBatchQuery>(
        countryCode,
        CATEGORY_POSTS_BATCH_QUERY,
        {
          slugs: normalizedSlugs,
          first: limit,
        },
        tags,
      ),
    normalize: (data) => {
      const nodes = data?.categories?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node))
      if (!nodes || nodes.length === 0) {
        return null
      }

      const mapped: Record<string, CategoryPostsResult> = {}
      for (const node of nodes) {
        const slug = normalizeSlug(node.slug)
        if (!slug) {
          continue
        }

        const posts =
          node.posts?.nodes?.filter((post): post is NonNullable<typeof post> => Boolean(post)).map((post) =>
            mapWordPressPostFromSource(post, "gql", countryCode),
          ) ?? []

        mapped[slug] = {
          category: mapCategoryFromGraphql(node),
          posts,
          hasNextPage: node.posts?.pageInfo?.hasNextPage ?? false,
          endCursor: node.posts?.pageInfo?.endCursor ?? null,
        }
      }

      return mapped
    },
    makeRestFallback: async () => {
      const categoryMap = await fetchRestCategoriesBySlugs(countryCode, normalizedSlugs, tags)
      const fallbackResults: Record<string, CategoryPostsResult> = {}

      for (const slug of normalizedSlugs) {
        const category = categoryMap.get(slug)
        if (!category) {
          fallbackResults[slug] = createEmptyResult()
          continue
        }

        const { items, hasMore } = await fetchCategoryPostsRest(countryCode, category, limit, tags)

        fallbackResults[slug] = {
          category,
          posts: items,
          hasNextPage: hasMore,
          endCursor: null,
        }
      }

      return fallbackResults
    },
    cacheTags: tags,
    logMeta: {
      operation: "category-posts-batch",
      countryCode,
      slugs: normalizedSlugs,
      limit,
    },
  })

  return ensureResultEntries(results, normalizedSlugs)
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
  after?: string | null,
): Promise<CategoryPostsResult> {
  const slug = normalizeSlug(categorySlug)
  const tags = buildWpCacheTags({
    country: countryCode,
    section: "categories",
    extra: [slug ? `category:${slug}` : null, `tag:${FP_TAG_SLUG}`],
  })

  return graphqlFirst<PostsByCategoryQuery, CategoryPostsResult>({
    fetchGraphql: () =>
      fetchFromWpGraphQL<PostsByCategoryQuery>(
        countryCode,
        POSTS_BY_CATEGORY_QUERY,
        {
          category: categorySlug,
          first: limit,
          tagSlugs: [FP_TAG_SLUG],
          after: after ?? undefined,
        },
        tags,
      ),
    normalize: (data) => {
      if (!data?.posts || !data?.categories) {
        return null
      }

      const catNode = data.categories.nodes?.[0] ?? null
      const category = catNode ? mapCategoryFromGraphql(catNode) : null
      const nodes = data.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []

      return {
        category,
        posts: nodes.map((post) => mapWordPressPostFromSource(post, "gql", countryCode)),
        hasNextPage: data.posts.pageInfo?.hasNextPage ?? false,
        endCursor: data.posts.pageInfo?.endCursor ?? null,
      }
    },
    makeRestFallback: async () => {
      const categories = await executeRestFallback(
        () =>
          fetchFromWp<WordPressCategory[]>(
            countryCode,
            wordpressQueries.categoryBySlug(categorySlug),
            { tags },
          ),
        `[v1] Category REST fallback failed for ${categorySlug} (${countryCode})`,
        { countryCode, categorySlug },
        { fallbackValue: [] },
      )

      const category = categories[0] ? mapCategoryFromRest(categories[0]) : null
      if (!category) {
        return createEmptyResult()
      }

      const tagsResponse = await executeRestFallback(
        () => fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(FP_TAG_SLUG), { tags }),
        `[v1] FP tag REST fallback failed for ${categorySlug} (${countryCode})`,
        { countryCode, categorySlug, tagSlug: FP_TAG_SLUG },
        { fallbackValue: [] },
      )

      const fpTag = tagsResponse[0]
      if (!fpTag) {
        return {
          category,
          posts: [],
          hasNextPage: false,
          endCursor: null,
        }
      }

      const { items, hasMore } = await fetchCategoryPostsRest(countryCode, category, limit, tags, {
        tagId: fpTag.id,
      })

      return {
        category,
        posts: items,
        hasNextPage: hasMore,
        endCursor: null,
      }
    },
    cacheTags: tags,
    logMeta: {
      operation: "category-posts",
      countryCode,
      categorySlug,
      limit,
      after,
    },
  })
}

export async function getCategoriesForCountry(countryCode: string): Promise<WordPressCategory[]> {
  const tags = buildWpCacheTags({ country: countryCode, section: "categories" })

  return graphqlFirst<CategoriesQuery, WordPressCategory[]>({
    fetchGraphql: () => fetchFromWpGraphQL<CategoriesQuery>(countryCode, CATEGORIES_QUERY, undefined, tags),
    normalize: (data) => {
      if (!data?.categories?.nodes) {
        return null
      }

      const nodes = data.categories.nodes.filter((node): node is NonNullable<typeof node> => Boolean(node))
      return nodes.map((node) => mapCategoryFromGraphql(node))
    },
    makeRestFallback: () =>
      executeRestFallback(
        () =>
          fetchFromWp<WordPressCategory[]>(
            countryCode,
            wordpressQueries.categories(),
            { tags },
          ),
        `[v1] Categories REST fallback failed for ${countryCode}`,
        { countryCode },
        { fallbackValue: [] },
      ),
    cacheTags: tags,
    logMeta: {
      operation: "categories",
      countryCode,
    },
  })
}

export async function fetchCategoryPosts(
  slug: string,
  cursor: string | null = null,
  countryCode: string = DEFAULT_COUNTRY,
) {
  const normalizedSlug = normalizeSlug(slug)
  const tags = buildWpCacheTags({
    country: countryCode,
    section: "categories",
    extra: [`category:${normalizedSlug}`],
  })

  const data = await fetchFromWpGraphQL<CategoryPostsQuery>(
    countryCode,
    CATEGORY_POSTS_QUERY,
    {
      slug,
      after: cursor ?? undefined,
      first: 10,
    },
    tags,
  )

  if (!data?.posts || !data?.categories) {
    return null
  }

  const catNode = data.categories.nodes?.[0] ?? null
  const category = catNode ? mapCategoryFromGraphql(catNode) : null
  const nodes = data.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []

  return {
    category,
    posts: nodes.map((post) => mapWordPressPostFromSource(post, "gql", countryCode)),
    pageInfo: {
      ...data.posts.pageInfo,
      endCursor: data.posts.pageInfo?.endCursor ?? null,
    },
  }
}

export const fetchAllCategories = (countryCode: string) => getCategoriesForCountry(countryCode)

export const getPostsByCategory = (slug: string, limit = 20) =>
  getPostsByCategoryForCountry(DEFAULT_COUNTRY, slug, limit)

export const getCategories = () => getCategoriesForCountry(DEFAULT_COUNTRY)

export const fetchCategories = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    return await getCategoriesForCountry(countryCode)
  } catch (error) {
    console.error("[v1] Failed to fetch categories during build:", error)
    return []
  }
}
