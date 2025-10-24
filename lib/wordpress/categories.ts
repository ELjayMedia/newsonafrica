import { buildCacheTags } from "../cache/tag-utils"
import {
  CATEGORY_POSTS_BATCH_QUERY,
  CATEGORY_POSTS_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
} from "../wordpress-queries"
import { fetchFromWpGraphQL } from "./client"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { DEFAULT_COUNTRY, FP_TAG_SLUG } from "./shared"
import type { CategoryPostsResult } from "./types"
import type { WordPressCategory } from "@/types/wp"
import type {
  CategoryPostsBatchQuery,
  CategoryPostsQuery,
  CategoriesQuery,
  PostsByCategoryQuery,
} from "@/types/wpgraphql"

export async function getPostsForCategories(
  countryCode: string,
  categorySlugs: string[],
  limit = 20,
): Promise<Record<string, CategoryPostsResult>> {
  const normalizedSlugs = Array.from(
    new Set(categorySlugs.map((slug) => slug?.trim().toLowerCase()).filter((slug): slug is string => Boolean(slug))),
  )

  if (normalizedSlugs.length === 0) {
    return {}
  }

  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: normalizedSlugs.map((slug) => `category:${slug}`),
  })

  const ensureEntry = (results: Record<string, CategoryPostsResult>, slug: string) => {
    if (!results[slug]) {
      results[slug] = {
        category: null,
        posts: [],
        hasNextPage: false,
        endCursor: null,
      }
    }
  }

  const results: Record<string, CategoryPostsResult> = {}

  try {
    const gqlData = await fetchFromWpGraphQL<CategoryPostsBatchQuery>(
      countryCode,
      CATEGORY_POSTS_BATCH_QUERY,
      {
        slugs: normalizedSlugs,
        first: limit,
      },
      tags,
    )

    const nodes = gqlData?.categories?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []

    nodes.forEach((node) => {
      const slug = node.slug?.toLowerCase()
      if (!slug) {
        return
      }

      const category: WordPressCategory = {
        id: node.databaseId ?? 0,
        name: node.name ?? "",
        slug: node.slug,
        description: node.description ?? undefined,
        count: node.count ?? undefined,
      }

      const posts =
        node.posts?.nodes?.filter((post): post is NonNullable<typeof post> => Boolean(post)).map((post) =>
          mapGraphqlPostToWordPressPost(post, countryCode),
        ) ?? []

      results[slug] = {
        category,
        posts,
        hasNextPage: node.posts?.pageInfo?.hasNextPage ?? false,
        endCursor: node.posts?.pageInfo?.endCursor ?? null,
      }
    })
  } catch (error) {
    console.error("[v0] Failed to fetch category posts via GraphQL:", error)
  }

  normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
  return results
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
  after?: string | null,
): Promise<CategoryPostsResult> {
  const slug = categorySlug.trim().toLowerCase()
  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: [slug ? `category:${slug}` : null, `tag:${FP_TAG_SLUG}`],
  })

  try {
    const variables: Record<string, string | number | string[]> = {
      category: categorySlug,
      first: limit,
      tagSlugs: [FP_TAG_SLUG],
    }

    if (after) {
      variables.after = after
    }

    const gqlData = await fetchFromWpGraphQL<PostsByCategoryQuery>(
      countryCode,
      POSTS_BY_CATEGORY_QUERY,
      variables,
      tags,
    )

    if (gqlData?.posts && gqlData?.categories) {
      const catNode = gqlData.categories.nodes?.[0] ?? null
      const category = catNode
        ? {
            id: catNode.databaseId ?? 0,
            name: catNode.name ?? "",
            slug: catNode.slug ?? slug,
            description: catNode.description ?? undefined,
            count: catNode.count ?? undefined,
          }
        : null
      const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
      const posts = nodes.map((p) => mapGraphqlPostToWordPressPost(p, countryCode))
      return {
        category,
        posts,
        hasNextPage: gqlData.posts.pageInfo.hasNextPage,
        endCursor: gqlData.posts.pageInfo.endCursor ?? null,
      }
    }
  } catch (error) {
    console.error(
      `[v0] Failed to fetch posts by category for ${categorySlug} (${countryCode}) via GraphQL:`,
      error,
    )
  }

  return { category: null, posts: [], hasNextPage: false, endCursor: null }
}

export async function getCategoriesForCountry(countryCode: string) {
  const tags = buildCacheTags({ country: countryCode, section: "categories" })

  try {
    const gqlData = await fetchFromWpGraphQL<CategoriesQuery>(countryCode, CATEGORIES_QUERY, undefined, tags)
    if (gqlData?.categories?.nodes) {
      return gqlData.categories.nodes
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .map((c) => ({
          id: c.databaseId ?? 0,
          name: c.name ?? "",
          slug: c.slug ?? "",
          description: c.description ?? undefined,
          count: c.count ?? undefined,
        }))
    }
  } catch (error) {
    console.error(`[v0] Failed to fetch categories via GraphQL for ${countryCode}:`, error)
  }

  return []
}

export async function fetchCategoryPosts(
  slug: string,
  cursor: string | null = null,
  countryCode: string,
) {
  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: [`category:${slug}`],
  })

  const variables: Record<string, string | number | string[]> = {
    slug,
    first: 10,
  }

  if (cursor) {
    variables.after = cursor
  }

  const data = await fetchFromWpGraphQL<CategoryPostsQuery>(
    countryCode,
    CATEGORY_POSTS_QUERY,
    variables,
    tags,
  )
  if (!data?.posts || !data?.categories) return null
  const catNode = data.categories.nodes?.[0] ?? null
  const category = catNode
    ? {
        id: catNode.databaseId ?? 0,
        name: catNode.name ?? "",
        slug: catNode.slug ?? slug,
        description: catNode.description ?? undefined,
        count: catNode.count ?? undefined,
      }
    : null
  const nodes = data.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
  return {
    category,
    posts: nodes.map((p) => mapGraphqlPostToWordPressPost(p, countryCode)),
    pageInfo: {
      ...data.posts.pageInfo,
      endCursor: data.posts.pageInfo.endCursor ?? null,
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
    console.error("[v0] Failed to fetch categories during build:", error)
    return []
  }
}
