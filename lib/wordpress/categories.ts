import { CACHE_DURATIONS } from "../cache/constants"
import { buildCacheTags } from "../cache/tag-utils"
import {
  CATEGORY_POSTS_BATCH_QUERY,
  CATEGORY_POSTS_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  wordpressQueries,
} from "../wordpress-queries"
import { executeRestFallback, fetchFromWp, fetchFromWpGraphQL } from "./client"
import { mapWpPost } from "../utils/mapWpPost"
import { DEFAULT_COUNTRY, FP_TAG_SLUG } from "./shared"
import type {
  CategoryPostsResult,
  WordPressCategory,
  WordPressPost,
  WordPressTag,
} from "./types"
import type {
  CategoryPostsBatchQuery,
  CategoryPostsQuery,
  CategoriesQuery,
  PostsByCategoryQuery,
} from "@/types/wpgraphql"

const REST_CATEGORY_CACHE_TTL_MS = CACHE_DURATIONS.SHORT * 1000

interface CachedCategoryPosts {
  posts: WordPressPost[]
  expiresAt: number
}

const restCategoryPostsCache = new Map<string, CachedCategoryPosts>()

const buildCategoryCacheKey = (countryCode: string, categoryId: number | string, limit: number) =>
  `${countryCode}:${categoryId}:${limit}`

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

  const gqlData = await fetchFromWpGraphQL<CategoryPostsBatchQuery>(
    countryCode,
    CATEGORY_POSTS_BATCH_QUERY,
    {
      slugs: normalizedSlugs,
      first: limit,
    },
    tags,
  )

  if (gqlData?.categories?.nodes?.length) {
    console.log("[v0] Category posts fetched:", gqlData.categories.nodes.length, "categories")
    gqlData.categories.nodes.forEach((node) => {
      if (!node?.slug) {
        return
      }

      const slug = String(node.slug).toLowerCase()
      const category: WordPressCategory = {
        id: node.databaseId ?? 0,
        name: node.name ?? "",
        slug: node.slug,
        description: node.description ?? undefined,
        count: node.count ?? undefined,
      }

      const nodes = node.posts?.nodes?.filter((post): post is NonNullable<typeof post> => Boolean(post)) ?? []
      const posts = nodes.map((post) => mapWpPost(post, "gql", countryCode))

      results[slug] = {
        category,
        posts,
        hasNextPage: node.posts?.pageInfo?.hasNextPage ?? false,
        endCursor: node.posts?.pageInfo?.endCursor ?? null,
      }
    })

    normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
    return results
  }

  console.log("[v0] GraphQL failed, falling back to REST for categories")

  try {
    const categories = await fetchFromWp<any[]>(countryCode, wordpressQueries.categoriesBySlugs(normalizedSlugs), {
      tags,
    })

    if (!categories || categories.length === 0) {
      console.log("[v0] No categories found via REST")
      normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
      return results
    }

    const categoriesBySlug = new Map<string, WordPressCategory>()
    categories.forEach((cat: any) => {
      if (!cat?.slug) {
        return
      }

      const slug = String(cat.slug).toLowerCase()
      categoriesBySlug.set(slug, {
        id: cat.id ?? cat.databaseId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? undefined,
        count: cat.count ?? undefined,
      })
    })

    for (const slug of normalizedSlugs) {
      const category = categoriesBySlug.get(slug) ?? null

      if (!category) {
        ensureEntry(results, slug)
        continue
      }

      const cacheKey = buildCategoryCacheKey(countryCode, category.id, limit)
      const cached = restCategoryPostsCache.get(cacheKey)
      let posts: WordPressPost[] = []

      if (cached && cached.expiresAt > Date.now()) {
        posts = cached.posts
      } else {
        const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit)
        try {
          const fetchedPosts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags })
          posts = fetchedPosts || []

          restCategoryPostsCache.set(cacheKey, {
            posts,
            expiresAt: Date.now() + REST_CATEGORY_CACHE_TTL_MS,
          })
        } catch (error) {
          console.error(`[v0] Failed to fetch posts for category ${category.slug}:`, error)
          restCategoryPostsCache.delete(cacheKey)
          posts = []
        }
      }

      results[slug] = {
        category,
        posts,
        hasNextPage: posts.length === limit,
        endCursor: null,
      }
    }

    normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
    return results
  } catch (error) {
    console.error("[v0] REST fallback failed for categories:", error)
    normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
    return results
  }
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
): Promise<CategoryPostsResult> {
  const slug = categorySlug.trim().toLowerCase()
  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: [slug ? `category:${slug}` : null, `tag:${FP_TAG_SLUG}`],
  })

  const gqlData = await fetchFromWpGraphQL<PostsByCategoryQuery>(
    countryCode,
    POSTS_BY_CATEGORY_QUERY,
    {
      category: categorySlug,
      first: limit,
      tagSlugs: [FP_TAG_SLUG],
    },
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
    const posts = nodes.map((p) => mapWpPost(p, "gql", countryCode))
    return {
      category,
      posts,
      hasNextPage: gqlData.posts.pageInfo.hasNextPage,
      endCursor: gqlData.posts.pageInfo.endCursor ?? null,
    }
  }
  const categories = await executeRestFallback(
    () => fetchFromWp<WordPressCategory[]>(countryCode, wordpressQueries.categoryBySlug(categorySlug), { tags }),
    `[v0] Category REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug },
    { fallbackValue: [] },
  )
  const category = categories[0]
  if (!category) {
    return { category: null, posts: [], hasNextPage: false, endCursor: null }
  }
  const fpTags = await executeRestFallback(
    () => fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(FP_TAG_SLUG), { tags }),
    `[v0] FP tag REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug, tagSlug: FP_TAG_SLUG },
    { fallbackValue: [] },
  )

  const fpTag = fpTags[0]
  if (!fpTag) {
    return { category, posts: [], hasNextPage: false, endCursor: null }
  }

  const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit, { tagId: fpTag.id })
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Posts by category REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug, categoryId: category.id, limit, endpoint, params },
    { fallbackValue: [] },
  )
  return { category, posts, hasNextPage: false, endCursor: null }
}

export async function getCategoriesForCountry(countryCode: string) {
  const tags = buildCacheTags({ country: countryCode, section: "categories" })

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
  const { endpoint, params } = wordpressQueries.categories()
  return await executeRestFallback(
    () => fetchFromWp<WordPressCategory[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Categories REST fallback failed for ${countryCode}`,
    { countryCode, endpoint, params },
    { fallbackValue: [] },
  )
}

export async function fetchCategoryPosts(
  slug: string,
  cursor: string | null = null,
  countryCode: string = DEFAULT_COUNTRY,
) {
  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: [`category:${slug}`],
  })

  const data = await fetchFromWpGraphQL<CategoryPostsQuery>(
    countryCode,
    CATEGORY_POSTS_QUERY,
    {
      slug,
      after: cursor,
      first: 10,
    },
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
    posts: nodes.map((p) => mapWpPost(p, "gql", countryCode)),
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
