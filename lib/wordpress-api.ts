import { getWpEndpoints } from '@/config/wp'
import { wordpressQueries } from './wordpress-queries'

export interface WordPressImage {
  source_url?: string
  alt_text?: string
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

async function fetchFromWp<T>(countryCode: string, query: { endpoint: string; params?: Record<string, any> }): Promise<T> {
  const base = getWpEndpoints(countryCode).rest
  const params = new URLSearchParams(
    Object.entries(query.params || {}).map(([k, v]) => [k, String(v)]),
  ).toString()
  const url = `${base}/${query.endpoint}${params ? `?${params}` : ''}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    throw new Error(`WordPress API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function getLatestPostsForCountry(countryCode: string, limit = 20) {
  const { endpoint, params } = wordpressQueries.recentPosts(limit)
  const posts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })
  return { posts, hasNextPage: false, endCursor: null }
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
) {
  const categories = await fetchFromWp<WordPressCategory[]>(
    countryCode,
    wordpressQueries.categoryBySlug(categorySlug),
  )
  const category = categories[0]
  if (!category) {
    return { category: null, posts: [], hasNextPage: false, endCursor: null }
  }
  const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit)
  const posts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })
  return { category, posts, hasNextPage: false, endCursor: null }
}

export async function getCategoriesForCountry(countryCode: string) {
  const { endpoint, params } = wordpressQueries.categories()
  return fetchFromWp<WordPressCategory[]>(countryCode, { endpoint, params })
}

export async function getPostBySlugForCountry(countryCode: string, slug: string) {
  const { endpoint, params } = wordpressQueries.postBySlug(slug)
  const posts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })
  return posts[0] || null
}

export async function getRelatedPostsForCountry(
  countryCode: string,
  postId: string,
  limit = 6,
) {
  const post = await fetchFromWp<WordPressPost>(countryCode, wordpressQueries.postById(postId))
  const categoryIds: number[] =
    post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.id) || []
  if (categoryIds.length === 0) return []
  const { endpoint, params } = wordpressQueries.relatedPosts(categoryIds, postId, limit)
  return fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const tags = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug('featured'))
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.featuredPosts(tag.id, limit)
  return fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })
}

export const getLatestPosts = (limit = 20) => getLatestPostsForCountry(DEFAULT_COUNTRY, limit)
export const getPostsByCategory = (slug: string, limit = 20) =>
  getPostsByCategoryForCountry(DEFAULT_COUNTRY, slug, limit)
export const getCategories = () => getCategoriesForCountry(DEFAULT_COUNTRY)
export const getPostBySlug = (slug: string) => getPostBySlugForCountry(DEFAULT_COUNTRY, slug)
export const getRelatedPosts = (
  postId: string,
  categories: string[] = [],
  tags: string[] = [],
  limit = 6,
  countryCode?: string,
) => getRelatedPostsForCountry(countryCode || DEFAULT_COUNTRY, postId, limit)
