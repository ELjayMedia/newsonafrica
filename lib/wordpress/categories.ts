import { buildCacheTags } from "../cache/tag-utils"
import { CACHE_DURATIONS } from "../cache/constants"

const CATEGORY_REVALIDATE = CACHE_DURATIONS.MEDIUM
import {
  CATEGORY_POSTS_BATCH_QUERY,
  CATEGORY_POSTS_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
} from "../wordpress-queries"
import { fetchWordPressGraphQL } from "./client"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { DEFAULT_COUNTRY } from "./shared"
import type { CategoryPostsResult } from "./types"
import type { WordPressCategory } from "@/types/wp"
import type {
  CategoryPostsBatchQuery,
  CategoryPostsQuery,
  CategoriesQuery,
  PostsByCategoryQuery,
} from "@/types/wpgraphql"

type CategoriesQueryNode = NonNullable<
  NonNullable<CategoriesQuery["categories"]>["nodes"]
>[number]

type CategoryNodeWithHierarchy = CategoriesQueryNode & {
  parentDatabaseId?: number | null
  children?: {
    nodes?: (CategoryNodeWithHierarchy | null)[] | null
  } | null
}

type WordPressCategoryWithChildren = WordPressCategory & {
  children?: WordPressCategoryWithChildren[]
}

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
    const gqlData = await fetchWordPressGraphQL<CategoryPostsBatchQuery>(
      countryCode,
      CATEGORY_POSTS_BATCH_QUERY,
      {
        slugs: normalizedSlugs,
        first: limit,
      },
      { tags, revalidate: CATEGORY_REVALIDATE },
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
    extra: [slug ? `category:${slug}` : null],
  })

  try {
    const variables: Record<string, string | number> = {
      category: categorySlug,
      first: limit,
    }

    if (after) {
      variables.after = after
    }

    const gqlData = await fetchWordPressGraphQL<PostsByCategoryQuery>(
      countryCode,
      POSTS_BY_CATEGORY_QUERY,
      variables,
      { tags, revalidate: CATEGORY_REVALIDATE },
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
    const gqlData = await fetchWordPressGraphQL<CategoriesQuery>(
      countryCode,
      CATEGORIES_QUERY,
      undefined,
      { tags, revalidate: CATEGORY_REVALIDATE },
    )
    if (gqlData?.categories?.nodes) {
      const nodes = gqlData.categories.nodes.filter(
        (node): node is CategoryNodeWithHierarchy =>
          Boolean(node && typeof node.databaseId === "number"),
      )

      if (nodes.length === 0) {
        return []
      }

      const nodeMap = new Map<number, CategoryNodeWithHierarchy>()
      const fallbackChildren = new Map<number, CategoryNodeWithHierarchy[]>()

      for (const node of nodes) {
        if (typeof node.databaseId !== "number") {
          continue
        }

        nodeMap.set(node.databaseId, node)

        const parentId =
          typeof node.parentDatabaseId === "number" ? node.parentDatabaseId : null

        if (parentId !== null) {
          if (!fallbackChildren.has(parentId)) {
            fallbackChildren.set(parentId, [])
          }

          fallbackChildren.get(parentId)!.push(node)
        }
      }

      const resolveChildNodes = (
        node: CategoryNodeWithHierarchy,
      ): CategoryNodeWithHierarchy[] => {
        const directChildren =
          node.children?.nodes
            ?.map((child) => {
              if (!child?.databaseId) {
                return null
              }

              return nodeMap.get(child.databaseId) ?? child
            })
            .filter((child): child is CategoryNodeWithHierarchy => Boolean(child)) ?? []

        if (directChildren.length > 0) {
          return directChildren
        }

        const databaseId =
          typeof node.databaseId === "number" ? node.databaseId : null

        if (databaseId !== null && fallbackChildren.has(databaseId)) {
          return fallbackChildren.get(databaseId) ?? []
        }

        return []
      }

      const buildCategoryTree = (
        node: CategoryNodeWithHierarchy,
        visited: Set<number> = new Set(),
      ): WordPressCategoryWithChildren => {
        const databaseId = typeof node.databaseId === "number" ? node.databaseId : 0

        const category: WordPressCategoryWithChildren = {
          id: databaseId,
          databaseId: node.databaseId ?? undefined,
          name: node.name ?? "",
          slug: node.slug ?? "",
          description: node.description ?? undefined,
          count: node.count ?? undefined,
        }

        if (databaseId && visited.has(databaseId)) {
          return category
        }

        const nextVisited = new Set(visited)
        if (databaseId) {
          nextVisited.add(databaseId)
        }

        const childNodes = resolveChildNodes(node)
        if (childNodes.length > 0) {
          const children = childNodes
            .map((childNode) => buildCategoryTree(childNode, nextVisited))
            .filter((child) => Boolean(child.slug))

          if (children.length > 0) {
            category.children = children
          }
        }

        return category
      }

      const rootNodes = nodes.filter((node) => {
        const parentId =
          typeof node.parentDatabaseId === "number" ? node.parentDatabaseId : null

        if (parentId === null) {
          return true
        }

        return !nodeMap.has(parentId)
      })

      return rootNodes
        .map((node) => buildCategoryTree(node))
        .filter((category) => Boolean(category.slug))
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

  const data = await fetchWordPressGraphQL<CategoryPostsQuery>(
    countryCode,
    CATEGORY_POSTS_QUERY,
    variables,
    { tags, revalidate: CACHE_DURATIONS.MEDIUM },
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
