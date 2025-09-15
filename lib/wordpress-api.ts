import { getWpEndpoints } from '@/config/wp'
import { wordpressQueries } from './wordpress-queries'
import { circuitBreaker } from './api/circuit-breaker'
import * as log from './log'
import { fetchWithTimeout } from './utils/fetchWithTimeout'
import { CACHE_DURATIONS } from '@/lib/cache-utils'
import { mapWpPost } from './utils/mapWpPost'
import { APIError } from './utils/errorHandling'

// Simple gql tag replacement
const gql = String.raw

const mapPostFromWp = (post: any, countryCode?: string) =>
  mapWpPost(post, 'rest', countryCode)

type RestFallbackContext = Record<string, unknown>

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const { message, name, stack } = error
    return { message, name, stack }
  }

  return { error }
}

const handleRestFallbackFailure = (
  message: string,
  context: RestFallbackContext,
  error: unknown,
): never => {
  const details = {
    ...context,
    error: toErrorDetails(error),
  }

  log.error(message, details)
  throw new APIError(message, 'REST_FALLBACK_FAILED', undefined, details)
}

const executeRestFallback = async <T>(
  operation: () => Promise<T | null | undefined>,
  message: string,
  context: RestFallbackContext,
): Promise<T> => {
  try {
    const result = await operation()
    if (result === null || result === undefined) {
      throw new Error('REST fallback returned no data')
    }
    return result
  } catch (error) {
    handleRestFallbackFailure(message, context, error)
    throw error instanceof Error ? error : new Error('REST fallback failed')
  }
}

export interface WordPressImage {
  sourceUrl?: string
  altText?: string
  mediaDetails?: {
    width?: number
    height?: number
  }
}

export interface WordPressAuthor {
  id: number
  name: string
  slug: string
  description?: string
}

export interface WordPressCategory {
  id: number
  name: string
  slug: string
  description?: string
  count?: number
}

export interface WordPressTag {
  id: number
  name: string
  slug: string
}

export interface WordPressPost {
  id: number
  date: string
  slug: string
  title: { rendered: string }
  excerpt: { rendered: string }
  content?: { rendered: string }
  _embedded?: any
  categories?: { nodes: WordPressCategory[] }
  tags?: { nodes: WordPressTag[] }
  author?: { node: WordPressAuthor }
  featuredImage?: { node: WordPressImage }
}

export interface WordPressComment {
  id: number
  author_name: string
  content: { rendered: string }
  date: string
  status: string
  post: number
}

export interface CountryConfig {
  code: string
  name: string
  flag: string
  apiEndpoint: string
  restEndpoint: string
}

export const COUNTRIES: Record<string, CountryConfig> = {
  sz: {
    code: 'sz',
    name: 'Eswatini',
    flag: '🇸🇿',
    apiEndpoint: getWpEndpoints('sz').graphql,
    restEndpoint: getWpEndpoints('sz').rest,
  },
  za: {
    code: 'za',
    name: 'South Africa',
    flag: '🇿🇦',
    apiEndpoint: getWpEndpoints('za').graphql,
    restEndpoint: getWpEndpoints('za').rest,
  },
}

const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_SITE || 'sz'

export async function fetchFromWpGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, any>,
): Promise<T | null> {
  const base = getWpEndpoints(countryCode).graphql
  const operation = async (): Promise<T | null> => {
    try {
      const res = await fetchWithTimeout(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: CACHE_DURATIONS.MEDIUM },
        timeout: 10000,
      })
      if (!res.ok) {
        log.error(`[v0] WordPress GraphQL request failed for ${base}`, { status: res.status })
        throw new Error('GraphQL request failed')
      }
      return (await res.json()) as T
    } catch (error) {
      log.error(`[v0] WordPress GraphQL request failed for ${base}`, { error })
      throw error
    }
  }

  try {
    return await circuitBreaker.execute<T | null>(base, operation, async () => null)
  } catch (error) {
    log.error(`[v0] Circuit breaker error for ${base}`, { error })
    return null
  }
}

const POST_FIELDS = gql`
  fragment PostFields on Post {
    databaseId
    id
    slug
    date
    title
    excerpt
    content
    featuredImage {
      node {
        sourceUrl
        altText
        mediaDetails {
          width
          height
        }
      }
    }
    categories {
      nodes {
        databaseId
        name
        slug
      }
    }
    tags {
      nodes {
        databaseId
        name
        slug
      }
    }
    author {
      node {
        databaseId
        name
        slug
      }
    }
  }
`

const LATEST_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query LatestPosts($country: String!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        countrySlugIn: [$country]
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

const POSTS_BY_CATEGORY_QUERY = gql`
  ${POST_FIELDS}
  query PostsByCategory($country: String!, $category: String!, $first: Int!) {
    categories(where: { slug: [$category] }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        countrySlugIn: [$country]
        categoryName: $category
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

const CATEGORIES_QUERY = gql`
  query AllCategories($first: Int = 100) {
    categories(first: $first, where: { hideEmpty: true }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
  }
`

const POST_CATEGORIES_QUERY = gql`
  query PostCategories($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      categories {
        nodes {
          databaseId
        }
      }
    }
  }
`

const RELATED_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query RelatedPosts(
    $country: String!
    $catIds: [ID!]
    $exclude: ID!
    $first: Int!
  ) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        notIn: [$exclude]
        countrySlugIn: [$country]
        categoryIn: $catIds
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

const FEATURED_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query FeaturedPosts($country: String!, $tag: String!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        countrySlugIn: [$country]
        tagSlugIn: [$tag]
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

const AUTHOR_DATA_QUERY = gql`
  ${POST_FIELDS}
  query AuthorData($slug: String!, $after: String, $first: Int!) {
    user(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      description
      avatar {
        url
      }
      posts(first: $first, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          ...PostFields
        }
      }
    }
  }
`

const CATEGORY_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query CategoryPosts($country: String!, $slug: String!, $after: String, $first: Int!) {
    categories(where: { slug: [$slug] }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        countrySlugIn: [$country]
        categoryName: $slug
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, any>
    method?: string
    payload?: unknown
  },
  timeout?: number,
): Promise<T | null>
export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, any>
    method?: string
    payload?: unknown
  },
  opts: { timeout?: number; withHeaders: true },
): Promise<{ data: T; headers: Headers } | null>
export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, any>
    method?: string
    payload?: unknown
  },
  opts: { timeout?: number; withHeaders?: boolean } = {},
): Promise<any> {
  const { timeout = 10000, withHeaders = false } =
    typeof opts === 'number' ? { timeout: opts, withHeaders: false } : opts

  const { method = 'GET', payload, params: queryParams = {}, endpoint } = query

  const base = getWpEndpoints(countryCode).rest
  const params = new URLSearchParams(
    Object.entries(queryParams).map(([k, v]) => [k, String(v)]),
  ).toString()
  const url = `${base}/${endpoint}${params ? `?${params}` : ''}`

  const operation = async (): Promise<T | null> => {
    try {
      const res = await fetchWithTimeout(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        next: { revalidate: CACHE_DURATIONS.MEDIUM },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
        timeout,
      })
      if (!res.ok) {
        log.error(`[v0] WordPress API error ${res.status} for ${url}`)
        return null
      }
      const rawData = await res.json()
      let data: any
      if (query.endpoint.startsWith('posts')) {

        if (Array.isArray(rawData)) {
          data = rawData.map((p: any) => mapPostFromWp(p, countryCode)) as T
        } else {
          data = mapPostFromWp(rawData, countryCode) as T
        }
      } else {
        data = rawData as T
      }

      if (withHeaders) {
        return { data: data as T, headers: res.headers }
      }
      return data as T
    } catch (error) {
      log.error(`[v0] WordPress API request failed for ${url}`, { error })
      throw error
    }
  }

  try {
    return await circuitBreaker.execute<T | null>(url, operation, async () => null)
  } catch (error) {
    log.error(`[v0] Circuit breaker error for ${url}`, { error })
    return null
  }
}

export async function getLatestPostsForCountry(countryCode: string, limit = 20) {
  const gqlData = await fetchFromWpGraphQL<any>(
    countryCode,
    LATEST_POSTS_QUERY,
    { country: countryCode, first: limit },
  )
  if (gqlData?.posts) {
    const posts = gqlData.posts.nodes.map((p: any) =>
      mapWpPost(p, 'gql', countryCode),
    )
    return {
      posts,
      hasNextPage: gqlData.posts.pageInfo.hasNextPage,
      endCursor: gqlData.posts.pageInfo.endCursor,
    }
  }
  const { endpoint, params } = wordpressQueries.recentPosts(limit)
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }),
    `[v0] Latest posts REST fallback failed for ${countryCode}`,
    { countryCode, limit, endpoint, params },
  )
  return { posts, hasNextPage: false, endCursor: null }
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
) {
  const gqlData = await fetchFromWpGraphQL<any>(
    countryCode,
    POSTS_BY_CATEGORY_QUERY,
    { country: countryCode, category: categorySlug, first: limit },
  )
  if (gqlData?.posts && gqlData?.categories) {
    const catNode = gqlData.categories.nodes[0]
    const category = catNode
      ? {
          id: catNode.databaseId,
          name: catNode.name,
          slug: catNode.slug,
          description: catNode.description ?? undefined,
          count: catNode.count ?? undefined,
        }
      : null
    const posts = gqlData.posts.nodes.map((p: any) =>
      mapWpPost(p, 'gql', countryCode),
    )
    return {
      category,
      posts,
      hasNextPage: gqlData.posts.pageInfo.hasNextPage,
      endCursor: gqlData.posts.pageInfo.endCursor,
    }
  }
  const categories = await executeRestFallback(
    () =>
      fetchFromWp<WordPressCategory[]>(
        countryCode,
        wordpressQueries.categoryBySlug(categorySlug),
      ),
    `[v0] Category REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug },
  )
  const category = categories[0]
  if (!category) {
    return { category: null, posts: [], hasNextPage: false, endCursor: null }
  }
  const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit)
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }),
    `[v0] Posts by category REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug, categoryId: category.id, limit, endpoint, params },
  )
  return { category, posts, hasNextPage: false, endCursor: null }
}

export async function getCategoriesForCountry(countryCode: string) {
  const gqlData = await fetchFromWpGraphQL<any>(countryCode, CATEGORIES_QUERY)
  if (gqlData?.categories) {
    return gqlData.categories.nodes.map((c: any) => ({
      id: c.databaseId,
      name: c.name,
      slug: c.slug,
      description: c.description ?? undefined,
      count: c.count ?? undefined,
    })) as WordPressCategory[]
  }
  const { endpoint, params } = wordpressQueries.categories()
  return await executeRestFallback(
    () => fetchFromWp<WordPressCategory[]>(countryCode, { endpoint, params }),
    `[v0] Categories REST fallback failed for ${countryCode}`,
    { countryCode, endpoint, params },
  )
}

export async function getRelatedPostsForCountry(
  countryCode: string,
  postId: string,
  limit = 6,
) {
  const gqlPost = await fetchFromWpGraphQL<any>(
    countryCode,
    POST_CATEGORIES_QUERY,
    { id: Number(postId) },
  )
  if (gqlPost?.post) {
    const catIds = gqlPost.post.categories.nodes.map((c: any) => c.databaseId)
    if (catIds.length > 0) {
      const gqlData = await fetchFromWpGraphQL<any>(
        countryCode,
        RELATED_POSTS_QUERY,
        {
          country: countryCode,
          catIds,
          exclude: Number(postId),
          first: limit,
        },
      )
      if (gqlData?.posts) {
        const posts = gqlData.posts.nodes.map((p: any) =>
          mapWpPost(p, 'gql', countryCode),
        )
        return posts.filter((p) => p.id !== Number(postId))
      }
    }
  }
  const post = await executeRestFallback(
    () =>
      fetchFromWp<WordPressPost>(
        countryCode,
        wordpressQueries.postById(postId),
      ),
    `[v0] Related posts REST fallback failed for base post ${postId} (${countryCode})`,
    { countryCode, postId },
  )
  const categoryIds: number[] =
    post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.id) || []
  if (categoryIds.length === 0) return []
  const { endpoint, params } = wordpressQueries.relatedPosts(categoryIds, postId, limit)
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }),
    `[v0] Related posts REST fallback failed for ${postId} (${countryCode})`,
    { countryCode, postId, categoryIds, limit, endpoint, params },
  )
  return posts.filter((p) => p.id !== Number(postId))
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const gqlData = await fetchFromWpGraphQL<any>(
    countryCode,
    FEATURED_POSTS_QUERY,
    { country: countryCode, tag: 'featured', first: limit },
  )
  if (gqlData?.posts) {
    return gqlData.posts.nodes.map((p: any) =>
      mapWpPost(p, 'gql', countryCode),
    )
  }
  const tags = await executeRestFallback(
    () =>
      fetchFromWp<WordPressTag[]>(
        countryCode,
        wordpressQueries.tagBySlug('featured'),
      ),
    `[v0] Featured tag REST fallback failed for ${countryCode}`,
    { countryCode },
  )
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.featuredPosts(tag.id, limit)
  return await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }),
    `[v0] Featured posts REST fallback failed for ${countryCode}`,
    { countryCode, tagId: tag.id, limit, endpoint, params },
  )
}

export const getLatestPosts = (limit = 20) => getLatestPostsForCountry(DEFAULT_COUNTRY, limit)
export const getPostsByCategory = (slug: string, limit = 20) =>
  getPostsByCategoryForCountry(DEFAULT_COUNTRY, slug, limit)
export const getCategories = () => getCategoriesForCountry(DEFAULT_COUNTRY)
export const getRelatedPosts = async (
  postId: string,
  categories: string[] = [],
  tags: string[] = [],
  limit = 6,
  countryCode?: string,
): Promise<WordPressPost[]> => {
  const country = countryCode || DEFAULT_COUNTRY

  // If tags are provided, attempt tag-intersection query via REST API
  if (tags.length > 0) {
    const { endpoint, params } = wordpressQueries.relatedPostsByTags(
      tags,
      postId,
      limit,
    )
    const posts = await executeRestFallback(
      () => fetchFromWp<WordPressPost[]>(country, { endpoint, params }),
      `[v0] Related posts by tags REST fallback failed for ${postId} (${country})`,
      { country, postId, tags, limit, endpoint, params },
    )
    return posts.filter((p) => p.id !== Number(postId))
  }

  const posts = await getRelatedPostsForCountry(country, postId, limit)
  return posts.filter((p) => p.id !== Number(postId))
}

// Legacy-compatible helper functions ---------------------------------------

export const fetchRecentPosts = async (limit = 20, countryCode = DEFAULT_COUNTRY) => {
  const { posts } = await getLatestPostsForCountry(countryCode, limit)
  return posts
}

export const fetchTaggedPosts = async (
  tagSlug: string,
  limit = 10,
  countryCode = DEFAULT_COUNTRY,
) => {
  const tags =
    (await fetchFromWp<WordPressTag[]>(
      countryCode,
      wordpressQueries.tagBySlug(tagSlug),
    )) || []
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
  return (
    (await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })) || []
  )
}

export async function fetchPosts(
  options: number | {
    page?: number
    perPage?: number
    category?: string
    tag?: string
    search?: string
    author?: string
    featured?: boolean
    countryCode?: string
    ids?: Array<number | string>
    countryTermId?: number
  } = {},
) {
  if (typeof options === 'number') {
    const { endpoint, params } = wordpressQueries.recentPosts(options)
    return (
      (await fetchFromWp<WordPressPost[]>(DEFAULT_COUNTRY, { endpoint, params })) || []
    )
  }

  const {
    page = 1,
    perPage = 10,
    category,
    tag,
    search,
    author,
    featured,
    countryCode = DEFAULT_COUNTRY,
    ids,
    countryTermId,
  } = options

  const query = wordpressQueries.posts({
    page,
    perPage,
    category,
    tag,
    search,
    author,
    featured,
    ids,
    countryTermId,
  })
  const result = await fetchFromWp<WordPressPost[]>(countryCode, query, {
    withHeaders: true,
  })
  const total = Number(result?.headers.get('X-WP-Total') || '0')
  const data = result?.data || []
  return { data, total }
}

export const fetchCategories = (countryCode = DEFAULT_COUNTRY) =>
  getCategoriesForCountry(countryCode)

export const fetchTags = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  return (
    (await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params })) || []
  )
}

export const fetchAuthors = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.authors()
  return (
    (await fetchFromWp<WordPressAuthor[]>(countryCode, { endpoint, params })) || []
  )
}

export async function resolveCountryTermId(slug: string): Promise<number | null> {
  const base = getWpEndpoints(
    process.env.NEXT_PUBLIC_DEFAULT_SITE || DEFAULT_COUNTRY,
  ).rest
  const res = await fetch(`${base}/countries?slug=${slug}`)
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0]?.id ?? null
}

export async function fetchPost({
  slug,
  countryCode = DEFAULT_COUNTRY,
  countryTermId,
}: {
  slug: string
  countryCode?: string
  countryTermId?: number
}) {
  const { endpoint, params } = wordpressQueries.postBySlug(slug)
  if (countryTermId) params.countries = countryTermId
  const posts = await fetchFromWp<WordPressPost[]>(countryCode, {
    endpoint,
    params,
  })
  return posts?.[0] || null
}

export const fetchCountries = async () => {
  return Object.values(COUNTRIES)
}

export const fetchSingleTag = async (slug: string, countryCode = DEFAULT_COUNTRY) => {
  const tags = await fetchFromWp<WordPressTag[]>(
    countryCode,
    wordpressQueries.tagBySlug(slug),
  )
  return tags?.[0] || null
}

export const fetchAllTags = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  return (
    (await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params })) || []
  )
}

export async function fetchAuthorData(
  slug: string,
  cursor: string | null = null,
  countryCode = DEFAULT_COUNTRY,
) {
  const data = await fetchFromWpGraphQL<any>(countryCode, AUTHOR_DATA_QUERY, {
    slug,
    after: cursor,
    first: 10,
  })
  if (!data?.user) return null
  return {
    ...data.user,
    posts: {
      nodes: data.user.posts.nodes.map((p: any) =>
        mapWpPost(p, 'gql', countryCode),
      ),
      pageInfo: data.user.posts.pageInfo,
    },
  }
}

export async function fetchCategoryPosts(
  slug: string,
  cursor: string | null = null,
  countryCode = DEFAULT_COUNTRY,
) {
  const data = await fetchFromWpGraphQL<any>(countryCode, CATEGORY_POSTS_QUERY, {
    country: countryCode,
    slug,
    after: cursor,
    first: 10,
  })
  if (!data?.posts || !data?.categories) return null
  const catNode = data.categories.nodes[0]
  const category = catNode
    ? {
        id: catNode.databaseId,
        name: catNode.name,
        slug: catNode.slug,
        description: catNode.description ?? undefined,
        count: catNode.count ?? undefined,
      }
    : null
  return {
    category,
    posts: data.posts.nodes.map((p: any) => mapWpPost(p, 'gql', countryCode)),
    pageInfo: data.posts.pageInfo,
  }
}

export const fetchAllCategories = (countryCode = DEFAULT_COUNTRY) =>
  getCategoriesForCountry(countryCode)

export async function fetchPendingComments(
  countryCode = DEFAULT_COUNTRY,
): Promise<WordPressComment[]> {
  const comments = await fetchFromWp<WordPressComment[]>(countryCode, {
    endpoint: 'comments',
    params: { status: 'hold', per_page: 100, _embed: 1 },
  })
  return comments || []
}

export async function approveComment(
  commentId: number,
  countryCode = DEFAULT_COUNTRY,
) {
  try {
    const res = await fetchFromWp<WordPressComment>(countryCode, {
      endpoint: `comments/${commentId}`,
      method: 'POST',
      payload: { status: 'approve' },
    })
    if (!res) throw new Error(`Failed to approve comment ${commentId}`)
    return res
  } catch (error) {
    log.error(`[v0] Failed to approve comment ${commentId}`, { error })
    throw error
  }
}

export async function deleteComment(
  commentId: number,
  countryCode = DEFAULT_COUNTRY,
) {
  try {
    const res = await fetchFromWp<WordPressComment>(countryCode, {
      endpoint: `comments/${commentId}`,
      method: 'DELETE',
    })
    if (!res) throw new Error(`Failed to delete comment ${commentId}`)
    return res
  } catch (error) {
    log.error(`[v0] Failed to delete comment ${commentId}`, { error })
    throw error
  }
}

export async function updateUserProfile() {
  // Placeholder – real implementation can integrate with WordPress REST API
  return null
}
