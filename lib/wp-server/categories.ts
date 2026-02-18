import {
  CATEGORY_POSTS_BATCH_QUERY,
  CATEGORY_POSTS_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
} from "@/lib/wordpress/queries"
import { CACHE_DURATIONS } from "../cache/constants"
import { fetchWordPressGraphQL } from "../wordpress/client"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { DEFAULT_COUNTRY } from "../wordpress/shared"
import type { CategoryPostsResult, WordPressCategory } from "@/types/wp"
import type {
  CategoryPostsBatchQuery,
  CategoryPostsQuery,
  CategoriesQuery,
  PostsByCategoryQuery,
} from "@/types/wpgraphql"
import { cacheTags } from "../cache/cacheTags"

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

  const tags = [cacheTags.edition(countryCode), ...normalizedSlugs.map((slug) => cacheTags.category(countryCode, slug))]

  let data: CategoryPostsBatchQuery | null = null

  try {
    const result = await fetchWordPressGraphQL<CategoryPostsBatchQuery>(
      countryCode,
      CATEGORY_POSTS_BATCH_QUERY,
      {
        slugs: normalizedSlugs,
        first: limit,
      },
      { tags, revalidate: CACHE_DURATIONS.NONE },
    )

    if (!result.ok) {
      console.error(`[v1] Failed to fetch category posts batch for ${countryCode}:`, result)
      return ensureResultEntries({}, normalizedSlugs)
    }

    data = result.data
  } catch (error) {
    console.error(
      `[v1] Failed to fetch category posts batch for ${countryCode}:`,
      error,
    )
  }

  const nodes = data?.categories?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []
  const results: Record<string, CategoryPostsResult> = {}

  for (const node of nodes) {
    const slug = normalizeSlug(node.slug)
    if (!slug) {
      continue
    }

    const posts =
      node.posts?.nodes?.filter((post): post is NonNullable<typeof post> => Boolean(post)).map((post) =>
        mapGraphqlPostToWordPressPost(post, countryCode),
      ) ?? []

    results[slug] = {
      category: mapCategoryFromGraphql(node),
      posts,
      hasNextPage: node.posts?.pageInfo?.hasNextPage ?? false,
      endCursor: node.posts?.pageInfo?.endCursor ?? null,
    }
  }

  return ensureResultEntries(results, normalizedSlugs)
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
  after?: string | null,
): Promise<CategoryPostsResult> {
  const slug = normalizeSlug(categorySlug)
  const tags = [cacheTags.edition(countryCode), cacheTags.category(countryCode, slug)]

  const variables: Record<string, string | number> = {
    category: categorySlug,
    first: limit,
  }

  if (after) {
    variables.after = after
  }

  try {
    const result = await fetchWordPressGraphQL<PostsByCategoryQuery>(
      countryCode,
      POSTS_BY_CATEGORY_QUERY,
      variables,
      { tags, revalidate: CACHE_DURATIONS.NONE },
    )

    if (!result.ok) {
      console.error(
        `[v1] Failed to fetch posts by category for ${categorySlug} (${countryCode}):`,
        result,
      )
      return createEmptyResult()
    }

    const data = result.data

    if (!data?.posts || !data?.categories) {
      return createEmptyResult()
    }

    const catNode = data.categories.nodes?.[0] ?? null
    const category = catNode ? mapCategoryFromGraphql(catNode) : null
    const nodes = data.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []

    return {
      category,
      posts: nodes.map((post) => mapGraphqlPostToWordPressPost(post, countryCode)),
      hasNextPage: data.posts.pageInfo?.hasNextPage ?? false,
      endCursor: data.posts.pageInfo?.endCursor ?? null,
    }
  } catch (error) {
    console.error(
      `[v1] Failed to fetch posts by category for ${categorySlug} (${countryCode}):`,
      error,
    )
    return createEmptyResult()
  }
}

export async function getCategoriesForCountry(countryCode: string): Promise<WordPressCategory[]> {
  const tags = [cacheTags.edition(countryCode)]

  try {
    const result = await fetchWordPressGraphQL<CategoriesQuery>(
      countryCode,
      CATEGORIES_QUERY,
      undefined,
      { tags, revalidate: CACHE_DURATIONS.NONE },
    )

    if (!result.ok) {
      console.error(`[v1] Failed to fetch categories for ${countryCode}:`, result)
      return []
    }

    const data = result.data
    const nodes = data?.categories?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []
    return nodes.map((node) => mapCategoryFromGraphql(node))
  } catch (error) {
    console.error(`[v1] Failed to fetch categories for ${countryCode}:`, error)
    return []
  }
}

export async function fetchCategoryPosts(
  slug: string,
  cursor: string | null = null,
  countryCode: string = DEFAULT_COUNTRY,
) {
  const normalizedSlug = normalizeSlug(slug)
  const tags = [cacheTags.edition(countryCode), cacheTags.category(countryCode, normalizedSlug)]

  const variables: Record<string, string | number | string[]> = {
    slug,
    first: 10,
  }

  if (cursor) {
    variables.after = cursor
  }

  const result = await fetchWordPressGraphQL<CategoryPostsQuery>(
    countryCode,
    CATEGORY_POSTS_QUERY,
    variables,
    { tags, revalidate: CACHE_DURATIONS.NONE },
  )

  if (!result.ok) {
    console.error(`[v1] Failed to fetch category posts for ${slug} (${countryCode}):`, result)
    return null
  }

  const data = result.data

  if (!data?.posts || !data?.categories) {
    return null
  }

  const catNode = data.categories.nodes?.[0] ?? null
  const category = catNode ? mapCategoryFromGraphql(catNode) : null
  const nodes = data.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []

  return {
    category,
    posts: nodes.map((post) => mapGraphqlPostToWordPressPost(post, countryCode)),
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
