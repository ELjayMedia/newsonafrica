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
  const posts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })
  // Ensure the current post isn't included in results
  return posts.filter((p) => p.id !== Number(postId))
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
      const posts = (await res.json()) as WordPressPost[]
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
  const tags = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(tagSlug))
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
  return fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params })
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
    return fetchFromWp<WordPressPost[]>(DEFAULT_COUNTRY, { endpoint, params })
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
  return fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params })
}

export const fetchAuthors = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.authors()
  return fetchFromWp<WordPressAuthor[]>(countryCode, { endpoint, params })
}

export const fetchCountries = async () => {
  return Object.values(COUNTRIES)
}

export const fetchSingleTag = async (slug: string, countryCode = DEFAULT_COUNTRY) => {
  const tags = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(slug))
  return tags[0] || null
}

export const fetchAllTags = (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  return fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params })
}

export async function updateUserProfile() {
  // Placeholder – real implementation can integrate with WordPress REST API
  return null
}
