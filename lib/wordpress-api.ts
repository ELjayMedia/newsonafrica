import { getWpEndpoints } from '@/config/wp'
import { wordpressQueries } from './wordpress-queries'
import { circuitBreaker } from './api/circuit-breaker'
import { GraphQLClient, gql } from 'graphql-request'
import * as log from './log'
import { fetchWithTimeout } from './utils/fetchWithTimeout'

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

function mapPostFromWp(post: any): WordPressPost {
  const featured = post._embedded?.['wp:featuredmedia']?.[0]
  const author = post._embedded?.['wp:author']?.[0]
  const categoryTerms = post._embedded?.['wp:term']?.[0] || []
  const tagTerms = post._embedded?.['wp:term']?.[1] || []

  return {
    ...post,
    featuredImage: featured
      ? {
          node: {
            sourceUrl: featured.source_url,
            altText: featured.alt_text || '',
            mediaDetails: {
              width: featured.media_details?.width,
              height: featured.media_details?.height,
            },
          },
        }
      : undefined,
    author: author
      ? { node: { id: author.id, name: author.name, slug: author.slug } }
      : undefined,
    categories: {
      nodes: categoryTerms.map((cat: any) => ({ id: cat.id, name: cat.name, slug: cat.slug })),
    },
    tags: {
      nodes: tagTerms.map((tag: any) => ({ id: tag.id, name: tag.name, slug: tag.slug })),
    },
  }
}

function decodeGlobalId(id: string): number {
  try {
    const decoded = Buffer.from(id, 'base64').toString('ascii')
    const parts = decoded.split(':')
    return Number(parts[parts.length - 1])
  } catch {
    return Number(id)
  }
}

function mapPostFromGql(post: any): WordPressPost {
  return {
    id: post.databaseId ?? decodeGlobalId(post.id),
    date: post.date,
    slug: post.slug,
    title: { rendered: post.title ?? '' },
    excerpt: { rendered: post.excerpt ?? '' },
    content: post.content ? { rendered: post.content } : undefined,
    featuredImage: post.featuredImage?.node
      ? {
          node: {
            sourceUrl: post.featuredImage.node.sourceUrl,
            altText: post.featuredImage.node.altText || '',
            mediaDetails: {
              width: post.featuredImage.node.mediaDetails?.width,
              height: post.featuredImage.node.mediaDetails?.height,
            },
          },
        }
      : undefined,
    author: post.author?.node
      ? {
          node: {
            id: post.author.node.databaseId ?? decodeGlobalId(post.author.node.id),
            name: post.author.node.name,
            slug: post.author.node.slug,
          },
        }
      : undefined,
    categories: {
      nodes:
        post.categories?.nodes.map((c: any) => ({
          id: c.databaseId ?? decodeGlobalId(c.id),
          name: c.name,
          slug: c.slug,
        })) || [],
    },
    tags: {
      nodes:
        post.tags?.nodes.map((t: any) => ({
          id: t.databaseId ?? decodeGlobalId(t.id),
          name: t.name,
          slug: t.slug,
        })) || [],
    },
  }
}

export async function fetchFromWpGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, any>,
): Promise<T | null> {
  const base = getWpEndpoints(countryCode).graphql
  const client = new GraphQLClient(base, {
    fetch: (input, init) => fetchWithTimeout(input, { ...init, timeout: 10000 }),
  })
  const operation = async (): Promise<T | null> => {
    try {
      return await client.request<T>(query, variables)
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
        taxQuery: { taxArray: [{ taxonomy: COUNTRY, field: SLUG, terms: [$country], operator: IN }] }
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
        taxQuery: {
          taxArray: [
            { taxonomy: COUNTRY, field: SLUG, terms: [$country], operator: IN }
            { taxonomy: CATEGORY, field: SLUG, terms: [$category], operator: IN }
          ]
        }
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
        taxQuery: {
          taxArray: [
            { taxonomy: COUNTRY, field: SLUG, terms: [$country], operator: IN }
            { taxonomy: CATEGORY, field: ID, terms: $catIds, operator: IN }
          ]
        }
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
        taxQuery: {
          taxArray: [
            { taxonomy: COUNTRY, field: SLUG, terms: [$country], operator: IN }
            { taxonomy: TAG, field: SLUG, terms: [$tag], operator: IN }
          ]
        }
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

export async function fetchFromWp<T>(
  countryCode: string,
  query: { endpoint: string; params?: Record<string, any> },
  timeout = 10000,
): Promise<T | null> {
  const base = getWpEndpoints(countryCode).rest
  const params = new URLSearchParams(
    Object.entries(query.params || {}).map(([k, v]) => [k, String(v)]),
  ).toString()
  const url = `${base}/${query.endpoint}${params ? `?${params}` : ''}`

  const operation = async (): Promise<T | null> => {
    try {
      const res = await fetchWithTimeout(url, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        next: { revalidate: 300 },
        timeout,
      })
      if (!res.ok) {
        log.error(`[v0] WordPress API error ${res.status} for ${url}`)
        return null
      }
      const data = await res.json()
      if (query.endpoint.startsWith('posts')) {
        if (Array.isArray(data)) {
          return data.map(mapPostFromWp) as T
        }
        return mapPostFromWp(data) as T
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
    const posts = gqlData.posts.nodes.map(mapPostFromGql)
    return {
      posts,
      hasNextPage: gqlData.posts.pageInfo.hasNextPage,
      endCursor: gqlData.posts.pageInfo.endCursor,
    }
  }
  const { endpoint, params } = wordpressQueries.recentPosts(limit)
  const posts =
    (await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })) || []
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
    const posts = gqlData.posts.nodes.map(mapPostFromGql)
    return {
      category,
      posts,
      hasNextPage: gqlData.posts.pageInfo.hasNextPage,
      endCursor: gqlData.posts.pageInfo.endCursor,
    }
  }
  const categories =
    (await fetchFromWp<WordPressCategory[]>(
      countryCode,
      wordpressQueries.categoryBySlug(categorySlug),
    )) || []
  const category = categories[0]
  if (!category) {
    return { category: null, posts: [], hasNextPage: false, endCursor: null }
  }
  const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit)
  const posts =
    (await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })) || []
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
  return (
    (await fetchFromWp<WordPressCategory[]>(countryCode, { endpoint, params })) || []
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
        const posts = gqlData.posts.nodes.map(mapPostFromGql)
        return posts.filter((p) => p.id !== Number(postId))
      }
    }
  }
  const post = await fetchFromWp<WordPressPost>(
    countryCode,
    wordpressQueries.postById(postId),
  )
  if (!post) return []
  const categoryIds: number[] =
    post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.id) || []
  if (categoryIds.length === 0) return []
  const { endpoint, params } = wordpressQueries.relatedPosts(categoryIds, postId, limit)
  const posts =
    (await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })) || []
  return posts.filter((p) => p.id !== Number(postId))
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const gqlData = await fetchFromWpGraphQL<any>(
    countryCode,
    FEATURED_POSTS_QUERY,
    { country: countryCode, tag: 'featured', first: limit },
  )
  if (gqlData?.posts) {
    return gqlData.posts.nodes.map(mapPostFromGql)
  }
  const tags =
    (await fetchFromWp<WordPressTag[]>(
      countryCode,
      wordpressQueries.tagBySlug('featured'),
    )) || []
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.featuredPosts(tag.id, limit)
  return (
    (await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })) || []
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
    try {
      const base = getWpEndpoints(country).rest
      const params = new URLSearchParams({
        tags: tags.join(','),
        exclude: postId,
        per_page: String(limit),
        _embed: '1',
      })
      const res = await fetch(`${base}/posts?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        next: { revalidate: 300 },
      })
      if (!res.ok) {
        return []
      }
      const data = (await res.json()) as any[]
      const posts = data.map(mapPostFromWp)
      return posts.filter((p) => p.id !== Number(postId))
    } catch (error) {
      console.error('Tag-intersection query failed:', error)
      return []
    }
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

export const fetchPostsByTag = fetchTaggedPosts

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
  } = options

  const params: Record<string, any> = { page, per_page: perPage, _embed: 1 }
  if (search) params.search = search
  if (category) params.categories = category
  if (tag) params.tags = tag
  if (author) params.author = author
  if (featured) params.sticky = 'true'

  const base = getWpEndpoints(countryCode).rest
  const url = `${base}/posts?${new URLSearchParams(params).toString()}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    throw new Error(`WordPress API error: ${res.status}`)
  }
  const total = Number(res.headers.get('X-WP-Total') || '0')
  const data = (await res.json()) as WordPressPost[]
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

export async function updateUserProfile() {
  // Placeholder – real implementation can integrate with WordPress REST API
  return null
}
