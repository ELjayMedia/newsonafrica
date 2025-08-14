
import { WORDPRESS_GRAPHQL_URL, WORDPRESS_REST_API_URL } from '@/config/wordpress';
import { relatedPostsCache } from '@/lib/cache/related-posts-cache';
import { DocumentNode, print } from 'graphql';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  LATEST_POSTS_QUERY,
  POST_BY_SLUG_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  FEATURED_POSTS_QUERY,
} from '@/graphql/queries';
import { cache } from 'react';

// TypeScript interfaces for WordPress data
export interface WordPressImage {
  sourceUrl: string;
  altText?: string;
  title?: string;
}

export interface WordPressAuthor {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: {
    url: string;
  };
}

export interface WordPressCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  parent?: {
    node: {
      name: string;
      slug: string;
    };
  };
}

export interface WordPressTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface WordPressPost {
  id: string;
  title: string;
  content?: string;
  excerpt: string;
  slug: string;
  date: string;
  modified?: string;
  status?: string;
  featuredImage?: {
    node: WordPressImage;
  };
  author: {
    node: WordPressAuthor;
  };
  categories: {
    nodes: WordPressCategory[];
  };
  tags: {
    nodes: WordPressTag[];
  };
  seo?: {
    title: string;
    metaDesc: string;
    opengraphImage?: {
      sourceUrl: string;
    };
  };
}

export interface WordPressPostsResponse {
  posts: {
    nodes: WordPressPost[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

export interface WordPressCategoriesResponse {
  categories: {
    nodes: WordPressCategory[];
  };
}

export interface WordPressSinglePostResponse {
  post: WordPressPost | null;
}

// Country configuration
export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  timezone: string;
  languages: string[];
  apiEndpoint: string;
  restEndpoint: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  sz: {
    code: 'sz',
    name: 'Eswatini',
    flag: '🇸🇿',
    currency: 'SZL',
    timezone: 'Africa/Mbabane',
    languages: ['en', 'ss'],
    apiEndpoint: 'https://newsonafrica.com/sz/graphql',
    restEndpoint: 'https://newsonafrica.com/sz/wp-json/wp/v2',
  },
  ng: {
    code: 'ng',
    name: 'Nigeria',
    flag: '🇳🇬',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    languages: ['en'],
    apiEndpoint: 'https://newsonafrica.com/ng/graphql',
    restEndpoint: 'https://newsonafrica.com/ng/wp-json/wp/v2',
  },
  ke: {
    code: 'ke',
    name: 'Kenya',
    flag: '🇰🇪',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    languages: ['en', 'sw'],
    apiEndpoint: 'https://newsonafrica.com/ke/graphql',
    restEndpoint: 'https://newsonafrica.com/ke/wp-json/wp/v2',
  },
  za: {
    code: 'za',
    name: 'South Africa',
    flag: '🇿🇦',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    languages: ['en', 'af', 'zu', 'xh'],
    apiEndpoint: 'https://newsonafrica.com/za/graphql',
    restEndpoint: 'https://newsonafrica.com/za/wp-json/wp/v2',
  },
  gh: {
    code: 'gh',
    name: 'Ghana',
    flag: '🇬🇭',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    languages: ['en'],
    apiEndpoint: 'https://newsonafrica.com/gh/graphql',
    restEndpoint: 'https://newsonafrica.com/gh/wp-json/wp/v2',
  },
  ug: {
    code: 'ug',
    name: 'Uganda',
    flag: '🇺🇬',
    currency: 'UGX',
    timezone: 'Africa/Kampala',
    languages: ['en'],
    apiEndpoint: 'https://newsonafrica.com/ug/graphql',
    restEndpoint: 'https://newsonafrica.com/ug/wp-json/wp/v2',
  },
  tz: {
    code: 'tz',
    name: 'Tanzania',
    flag: '🇹🇿',
    currency: 'TZS',
    timezone: 'Africa/Dar_es_Salaam',
    languages: ['en', 'sw'],
    apiEndpoint: 'https://newsonafrica.com/tz/graphql',
    restEndpoint: 'https://newsonafrica.com/tz/wp-json/wp/v2',
  },
  rw: {
    code: 'rw',
    name: 'Rwanda',
    flag: '🇷🇼',
    currency: 'RWF',
    timezone: 'Africa/Kigali',
    languages: ['en', 'rw', 'fr'],
    apiEndpoint: 'https://newsonafrica.com/rw/graphql',
    restEndpoint: 'https://newsonafrica.com/rw/wp-json/wp/v2',
  },
};

// Utility function to get country-specific endpoints
function getCountryEndpoints(countryCode: string) {
  const country = COUNTRIES[countryCode];
  if (!country) {
    // Fallback to default (sz)
    return {
      graphql: COUNTRIES.sz.apiEndpoint,
      rest: COUNTRIES.sz.restEndpoint,
    };
  }
  return {
    graphql: country.apiEndpoint,
    rest: country.restEndpoint,
  };
}

// Enhanced cache with LRU-like behavior
const categoryCache = new Map<string, { data: any; timestamp: number; hits: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

// Cache cleanup function
function cleanupCache() {
  if (categoryCache.size <= MAX_CACHE_SIZE) return;

  // Sort by hits and timestamp, remove least used entries
  const entries = Array.from(categoryCache.entries()).sort((a, b) => {
    const aScore = a[1].hits + (Date.now() - a[1].timestamp) / 1000;
    const bScore = b[1].hits + (Date.now() - b[1].timestamp) / 1000;
    return aScore - bScore;
  });

  // Remove oldest 25% of entries
  const toRemove = Math.floor(entries.length * 0.25);
  for (let i = 0; i < toRemove; i++) {
    categoryCache.delete(entries[i][0]);
  }
}

// Generic API cache used by legacy helpers
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Online/offline helpers
const isOnline = () => {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true;
};

const isServer = () => typeof window === 'undefined';

// Fetch data from WordPress REST API with retry logic
async function fetchFromRestApi(endpoint: string, params: Record<string, any> = {}) {
  const queryParams = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();

  const url = `${WORDPRESS_REST_API_URL}/${endpoint}${queryParams ? `?${queryParams}` : ''}`;

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'NewsOnAfrica/1.0',
        },
        signal: controller.signal,
        next: { revalidate: 300 },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`REST API request attempt ${attempt + 1} failed:`, error);
      lastError = error;

      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }

      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }

  throw lastError;
}

// Fetch with GraphQL first then fallback to REST API
async function fetchWithFallback(
  query: string,
  variables: Record<string, any> = {},
  cacheKey: string,
  restFallback: () => Promise<any>,
) {
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (!isServer() && !isOnline()) {
    console.log('Device is offline, using cache or returning empty data');
    return cached?.data || [];
  }

  try {
    const data = await graphqlRequest<any>(query, variables);
    apiCache.set(cacheKey, { data, timestamp: Date.now(), ttl: CACHE_TTL });
    return data;
  } catch (error) {
    console.error('GraphQL request failed, falling back to REST API:', error);
    try {
      const restData = await restFallback();
      apiCache.set(cacheKey, { data: restData, timestamp: Date.now(), ttl: CACHE_TTL });
      return restData;
    } catch (restError) {
      console.error('Both GraphQL and REST API failed:', restError);
      return cached?.data || [];
    }
  }
}

// Utility function to make GraphQL requests
async function graphqlRequest<T>(
  query: string | DocumentNode,
  variables: Record<string, any> = {},
  countryCode?: string,
  retries = 3,
  tags?: string[],
): Promise<T> {
  const queryString = typeof query === 'string' ? query : print(query);
  const endpoints = getCountryEndpoints(countryCode || 'sz');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoints.graphql, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
      },
      body: JSON.stringify({
        query: queryString,
        variables,
      }),
      signal: controller.signal,
      next: { revalidate: 300, tags }, // Cache for 5 minutes with tags
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    return result.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && error instanceof Error) {
      console.warn(`GraphQL request failed, retrying... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return graphqlRequest<T>(query, variables, countryCode, retries - 1);
    }

    throw error;
  }
}

// REST API fallback function
async function restApiFallback<T>(
  endpoint: string,
  params: Record<string, any> = {},
  transform: (data: any) => T,
  countryCode?: string,
): Promise<T> {
  const endpoints = getCountryEndpoints(countryCode || 'sz');
  const queryParams = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();

  const url = `${endpoints.rest}/${endpoint}${queryParams ? `?${queryParams}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`REST API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return transform(data);
  } catch (error) {
    console.error('REST API fallback failed:', error);
    throw error;
  }
}

async function fetchWithGraphQLFallback<T>(
  graphqlFetch: () => Promise<T>,
  restFetch: () => Promise<T>,
  defaultValue: T,
): Promise<T> {
  try {
    return await graphqlFetch();
  } catch (error) {
    console.error('GraphQL request failed, trying REST API:', error);
    try {
      return await restFetch();
    } catch (restError) {
      console.error('Both GraphQL and REST API failed:', restError);
      return defaultValue;
    }
  }
}

/**
 * Get the latest posts from WordPress for a specific country
 */
export async function getLatestPostsForCountry(
  countryCode: string,
  limit = 20,
  after?: string,
): Promise<{ posts: WordPressPost[]; hasNextPage: boolean; endCursor: string | null }> {
  return fetchWithGraphQLFallback(
    () =>
      graphqlRequest<WordPressPostsResponse>(
        LATEST_POSTS_QUERY,
        {
          first: limit,
          after,
        },
        countryCode,
      ).then((data) => ({
        posts: data.posts.nodes,
        hasNextPage: data.posts.pageInfo.hasNextPage,
        endCursor: data.posts.pageInfo.endCursor,
      })),
    () =>
      restApiFallback(
        'posts',
        { per_page: limit, _embed: 1 },
        (posts: any[]) => ({
          posts: posts.map(transformRestPostToGraphQL),
          hasNextPage: posts.length === limit,
          endCursor: null,
        }),
        countryCode,
      ),
    { posts: [], hasNextPage: false, endCursor: null },
  );
}

/**
 * Get posts by category for a specific country
 */
export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
  after?: string,
): Promise<{
  category: WordPressCategory | null;
  posts: WordPressPost[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  return fetchWithGraphQLFallback(
    () =>
      graphqlRequest<{ category: any }>(
        POSTS_BY_CATEGORY_QUERY,
        {
          slug: categorySlug,
          first: limit,
          after,
        },
        countryCode,
      ).then((data) => {
        if (!data.category) {
          return { category: null, posts: [], hasNextPage: false, endCursor: null };
        }
        return {
          category: {
            id: data.category.id,
            name: data.category.name,
            slug: data.category.slug,
            description: data.category.description,
          },
          posts: data.category.posts.nodes,
          hasNextPage: data.category.posts.pageInfo.hasNextPage,
          endCursor: data.category.posts.pageInfo.endCursor,
        };
      }),
    async () => {
      const categories = await restApiFallback(
        `categories?slug=${categorySlug}`,
        {},
        (cats: any[]) => cats,
        countryCode,
      );

      if (!categories || categories.length === 0) {
        return { category: null, posts: [], hasNextPage: false, endCursor: null };
      }

      const category = categories[0];
      const posts = await restApiFallback(
        'posts',
        { categories: category.id, per_page: limit, _embed: 1 },
        (posts: any[]) => posts.map(transformRestPostToGraphQL),
        countryCode,
      );

      return {
        category: transformRestCategoryToGraphQL(category),
        posts,
        hasNextPage: posts.length === limit,
        endCursor: null,
      };
    },
    { category: null, posts: [], hasNextPage: false, endCursor: null },
  );
}

/**
 * Get categories for a specific country
 */
export async function getCategoriesForCountry(countryCode: string): Promise<WordPressCategory[]> {
  return fetchWithGraphQLFallback(
    () =>
      graphqlRequest<WordPressCategoriesResponse>(CATEGORIES_QUERY, {}, countryCode).then(
        (data) => data.categories.nodes,
      ),
    () =>
      restApiFallback(
        'categories',
        { per_page: 100 },
        (categories: any[]) => categories.map(transformRestCategoryToGraphQL),
        countryCode,
      ),
    [],
  );
}

/**
 * Get the latest posts from WordPress
 */
export async function getLatestPosts(limit = 20, after?: string) {
  try {
    const { posts, hasNextPage, endCursor } = await fetchRecentPosts(limit, after);
    return {
      posts: posts || [],
      hasNextPage,
      endCursor,
      error: null,
    };
  } catch (error) {
    console.error('Failed to fetch latest posts:', error);
    return {
      posts: [],
      hasNextPage: false,
      endCursor: null,
      error: error instanceof Error ? error.message : 'Failed to fetch posts',
    };
  }
}

/**
 * Get a single post by slug
 */
export async function getPostBySlug(slug: string, tags?: string[]): Promise<WordPressPost | null> {
  return fetchWithGraphQLFallback(
    () =>
      graphqlRequest<WordPressSinglePostResponse>(
        POST_BY_SLUG_QUERY,
        {
          slug,
        },
        undefined,
        3,
        tags,
      ).then((data) => data.post),
    () =>
      restApiFallback(`posts?slug=${slug}&_embed=1`, {}, (posts: any[]) => {
        if (!posts || posts.length === 0) return null;
        return transformRestPostToGraphQL(posts[0]);
      }),
    null,
  );
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<WordPressCategory[]> {
  return getCategoriesForCountry('sz');
}

/**
 * Get posts by category with caching
 */
export async function getPostsByCategory(
  categorySlug: string,
  limit = 20,
  after?: string | null,
): Promise<{
  category: WordPressCategory | null;
  posts: WordPressPost[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  // Create cache key
  const cacheKey = `category:${categorySlug}:${limit}:${after || 'null'}`;

  // Check cache first
  const cached = categoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Increment hit counter
    cached.hits++;
    return cached.data;
  }

  try {
    // If not in cache, fetch from API
    const result = await getPostsByCategoryForCountry('sz', categorySlug, limit, after || null);

    // Cache the result
    categoryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      hits: 1,
    });

    // Cleanup cache if needed
    cleanupCache();

    return result;
  } catch (error) {
    // If we have stale cached data, return it as fallback
    if (cached) {
      console.warn('Using stale cache data due to API error:', error);
      return cached.data;
    }
    throw error;
  }
}

/**
 * Get featured posts (sticky posts)
 */
export async function getFeaturedPosts(limit = 10): Promise<WordPressPost[]> {
  return fetchWithGraphQLFallback(
    () =>
      graphqlRequest<WordPressPostsResponse>(FEATURED_POSTS_QUERY, {
        first: limit,
      }).then((data) => data.posts.nodes),
    () =>
      restApiFallback('posts', { sticky: true, per_page: limit, _embed: 1 }, (posts: any[]) =>
        posts.map(transformRestPostToGraphQL),
      ),
    [],
  );
}

/**
 * Get posts by category with error handling
 */
export async function getCategoryPosts(slug: string, after?: string) {
  try {
    const category = await fetchCategoryPosts(slug, after);
    return {
      category,
      error: null,
    };
  } catch (error) {
    console.error(`Failed to fetch category posts for ${slug}:`, error);
    return {
      category: {
        id: '',
        name: slug,
        description: '',
        posts: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [],
        },
      },
      error: error instanceof Error ? error.message : 'Failed to fetch category posts',
    };
  }
}

/**
 * Get single post with error handling
 */
export async function getPost(slug: string) {
  try {
    const post = await fetchSinglePost(slug);
    return {
      post,
      error: null,
    };
  } catch (error) {
    console.error(`Failed to fetch post ${slug}:`, error);
    return {
      post: null,
      error: error instanceof Error ? error.message : 'Failed to fetch post',
    };
  }
}

/**
 * Get related posts based on categories and tags with caching
 */
export async function getRelatedPosts(
  postId: string,
  categories: string[] = [],
  tags: string[] = [],
  limit = 6,
  countryCode?: string,
): Promise<WordPressPost[]> {
  // Check cache first
  const cached = relatedPostsCache.get(postId, categories, tags, limit, countryCode);
  if (cached) {
    return cached;
  }
  const graphqlFetch = async () => {
    const RELATED_POSTS_QUERY = `
      query GetRelatedPosts($categoryIn: [ID], $tagIn: [ID], $notIn: [ID], $first: Int) {
        posts(
          where: {
            categoryIn: $categoryIn
            tagIn: $tagIn
            notIn: $notIn
            orderby: { field: DATE, order: DESC }
          }
          first: $first
        ) {
          nodes {
            id
            title
            excerpt
            slug
            date
            modified
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
            author {
              node {
                id
                name
                slug
                firstName
                lastName
                avatar {
                  url
                }
              }
            }
            categories {
              nodes {
                id
                name
                slug
              }
            }
            tags {
              nodes {
                id
                name
                slug
              }
            }
            seo {
              title
              metaDesc
            }
          }
        }
      }
    `;
    let relatedPosts: WordPressPost[] = [];

    if (categories.length > 0) {
      const categoryData = await graphqlRequest<{ posts: { nodes: WordPressPost[] } }>(
        RELATED_POSTS_QUERY,
        {
          categoryIn: categories,
          notIn: [postId],
          first: limit,
        },
        countryCode,
      );
      relatedPosts = categoryData.posts.nodes;
    }

    if (relatedPosts.length < limit && tags.length > 0) {
      const remainingLimit = limit - relatedPosts.length;
      const tagData = await graphqlRequest<{ posts: { nodes: WordPressPost[] } }>(
        RELATED_POSTS_QUERY,
        {
          tagIn: tags,
          notIn: [postId, ...relatedPosts.map((p) => p.id)],
          first: remainingLimit,
        },
        countryCode,
      );
      relatedPosts = [...relatedPosts, ...tagData.posts.nodes];
    }

    if (relatedPosts.length < 3 && categories.length > 0) {
      const remainingLimit = Math.max(3 - relatedPosts.length, 0);
      const latestData = await graphqlRequest<{ posts: { nodes: WordPressPost[] } }>(
        RELATED_POSTS_QUERY,
        {
          categoryIn: categories,
          notIn: [postId, ...relatedPosts.map((p) => p.id)],
          first: remainingLimit,
        },
        countryCode,
      );
      relatedPosts = [...relatedPosts, ...latestData.posts.nodes];
    }

    const finalPosts = relatedPosts.slice(0, limit);
    relatedPostsCache.set(postId, categories, tags, limit, finalPosts, countryCode);
    return finalPosts;
  };

  const restFetch = async () => {
    const endpoints = getCountryEndpoints(countryCode || 'sz');
    const params = new URLSearchParams({
      per_page: limit.toString(),
      exclude: postId,
      _embed: '1',
    });

    if (categories.length > 0) {
      params.append('categories', categories.join(','));
    }

    const response = await fetch(`${endpoints.rest}/posts?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`REST API request failed: ${response.status}`);
    }

    const posts = await response.json();
    const transformedPosts = posts.map(transformRestPostToGraphQL).slice(0, limit);
    relatedPostsCache.set(postId, categories, tags, limit, transformedPosts, countryCode);
    return transformedPosts;
  };

  return fetchWithGraphQLFallback(graphqlFetch, restFetch, []);
}

/**
 * Invalidate related posts cache for a specific post
 */
export function invalidateRelatedPostsCache(postId: string): void {
  relatedPostsCache.invalidatePost(postId);
}

/**
 * Invalidate related posts cache for a specific category
 */
export function invalidateRelatedPostsCacheByCategory(categorySlug: string): void {
  relatedPostsCache.invalidateCategory(categorySlug);
}

/**
 * Get related posts cache statistics
 */
export function getRelatedPostsCacheStats() {
  return relatedPostsCache.getStats();
}

/**
 * Clear all related posts cache
 */
export function clearRelatedPostsCache(): void {
  relatedPostsCache.clear();
}

/**

 * Fetches recent posts
 */
export const fetchRecentPosts = cache(async (limit = 20, after: string | null = null) => {
  const query = `
    query RecentPosts($limit: Int!, $after: String) {
      posts(
        first: $limit,
        after: $after,
        where: {
          orderby: { field: DATE, order: DESC }
          status: PUBLISH
        }
      ) {
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          author {
            node {
              name
              slug
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
          tags {
            nodes {
              name
              slug
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const restFallback = async () => {
    const offset = after
      ? parseInt(Buffer.from(after, 'base64').toString('utf8').split(':')[1], 10) + 1
      : 0;

    const params = new URLSearchParams({
      per_page: String(limit),
      offset: String(offset),
      _embed: '1',
      orderby: 'date',
      order: 'desc',
    });

    const url = `${WORDPRESS_REST_API_URL}/posts?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'NewsOnAfrica/1.0',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`REST API error: ${response.status} ${response.statusText}`);
    }

    const posts = await response.json();
    const endCursor =
      posts.length > 0
        ? Buffer.from(`arrayconnection:${offset + posts.length - 1}`).toString('base64')
        : null;

    return {
      posts: {
        nodes: posts.map((post: any) => ({
          id: post.id.toString(),
          title: post.title?.rendered || '',
          slug: post.slug || '',
          date: post.date || '',
          excerpt: post.excerpt?.rendered || '',
          featuredImage: post._embedded?.['wp:featuredmedia']?.[0]
            ? {
                node: {
                  sourceUrl: post._embedded['wp:featuredmedia'][0].source_url,
                  altText: post._embedded['wp:featuredmedia'][0].alt_text || '',
                },
              }
            : null,
          author: {
            node: {
              name: post._embedded?.['author']?.[0]?.name || 'Unknown',
              slug: post._embedded?.['author']?.[0]?.slug || '',
            },
          },
          categories: {
            nodes:
              post._embedded?.['wp:term']?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
          tags: {
            nodes:
              post._embedded?.['wp:term']?.[1]?.map((tag: any) => ({
                name: tag.name,
                slug: tag.slug,
              })) || [],
          },
        })),
        pageInfo: {
          hasNextPage: posts.length === limit,
          endCursor,
        },
      },
    };
  };

  const data = await fetchWithFallback(
    query,
    { limit, after },
    `recent-posts-${limit}-${after || 'start'}`,
    restFallback,
  );

  return {
    posts: data.posts?.nodes || [],
    hasNextPage: data.posts?.pageInfo?.hasNextPage || false,
    endCursor: data.posts?.pageInfo?.endCursor || null,
  };
});

/**
 * Fetches posts by category
 */
export const fetchCategoryPosts = cache(async (slug: string, after: string | null = null) => {
  const query = `
    query CategoryPosts($slug: ID!, $after: String) {
      category(id: $slug, idType: SLUG) {
        id
        name
        description
        posts(first: 20, after: $after, where: { status: PUBLISH }) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            slug
            date
            excerpt
            featuredImage {
              node {
                sourceUrl
                altText
              }
            }
            author {
              node {
                name
                slug
              }
            }
            categories {
              nodes {
                name
                slug
              }
            }
            tags {
              nodes {
                name
                slug
              }
            }
          }
        }
      }
    }
  `;

  const restFallback = async () => {
    try {
      const categories = await fetchFromRestApi('categories', { slug });
      if (!categories || categories.length === 0) {
        throw new Error(`Category not found: ${slug}`);
      }

      const categoryId = categories[0].id;
      const categoryData = categories[0];

      const posts = await fetchFromRestApi('posts', {
        categories: categoryId,
        per_page: 20,
        _embed: 1,
      });

      return {
        category: {
          id: categoryData.id.toString(),
          name: categoryData.name,
          description: categoryData.description || '',
          posts: {
            pageInfo: {
              hasNextPage: posts.length >= 20,
              endCursor: null,
            },
            nodes: posts.map((post: any) => ({
              id: post.id.toString(),
              title: post.title?.rendered || '',
              slug: post.slug || '',
              date: post.date || '',
              excerpt: post.excerpt?.rendered || '',
              featuredImage: post._embedded?.['wp:featuredmedia']?.[0]
                ? {
                    node: {
                      sourceUrl: post._embedded['wp:featuredmedia'][0].source_url,
                      altText: post._embedded['wp:featuredmedia'][0].alt_text || '',
                    },
                  }
                : null,
              author: {
                node: {
                  name: post._embedded?.['author']?.[0]?.name || 'Unknown',
                  slug: post._embedded?.['author']?.[0]?.slug || '',
                },
              },
              categories: {
                nodes:
                  post._embedded?.['wp:term']?.[0]?.map((cat: any) => ({
                    name: cat.name,
                    slug: cat.slug,
                  })) || [],
              },
              tags: {
                nodes:
                  post._embedded?.['wp:term']?.[1]?.map((tag: any) => ({
                    name: tag.name,
                    slug: tag.slug,
                  })) || [],
              },
            })),
          },
        },
      };
    } catch (error) {
      console.error(`Failed to fetch category ${slug}:`, error);
      return {
        category: {
          id: '',
          name: slug,
          description: '',
          posts: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        },
      };
    }
  };

  const data = await fetchWithFallback(
    query,
    { slug, after },
    `category-${slug}-${after || 'first'}`,
    restFallback,
  );
  return data.category;
});

/**
 * Fetches all categories
 */
export const fetchAllCategories = cache(async () => {
  const query = `
    query AllCategories {
      categories(first: 100, where: { hideEmpty: true }) {
        nodes {
          id
          name
          slug
          description
          count
        }
      }
    }
  `;

  const restFallback = async () => {
    const categories = await fetchFromRestApi('categories', { per_page: 100, hide_empty: true });
    return {
      categories: {
        nodes: categories.map((cat: any) => ({
          id: cat.id.toString(),
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          count: cat.count || 0,
        })),
      },
    };
  };

  const data = await fetchWithFallback(query, {}, 'all-categories', restFallback);
  return data.categories?.nodes || [];
});

/**
 * Fetches a single post
 */
export const fetchSinglePost = async (slug: string) => {
  const query = `
    query SinglePost($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        id
        title
        content
        excerpt
        slug
        date
        modified
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            name
            slug
            description
            avatar {
              url
            }
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        tags {
          nodes {
            name
            slug
          }
        }
        seo {
          title
          metaDesc
        }
      }
    }
  `;

  const restFallback = async () => {
    const posts = await fetchFromRestApi(`posts?slug=${slug}&_embed=1`);

    if (!posts || posts.length === 0) {
      return { post: null };
    }

    const post = posts[0];
    return {
      post: {
        id: post.id.toString(),
        title: post.title?.rendered || '',
        content: post.content?.rendered || '',
        excerpt: post.excerpt?.rendered || '',
        slug: post.slug || '',
        date: post.date || '',
        modified: post.modified || '',
        featuredImage: post._embedded?.['wp:featuredmedia']?.[0]
          ? {
              node: {
                sourceUrl: post._embedded['wp:featuredmedia'][0].source_url,
                altText: post._embedded['wp:featuredmedia'][0].alt_text || '',
              },
            }
          : null,
        author: {
          node: {
            name: post._embedded?.['author']?.[0]?.name || 'Unknown',
            slug: post._embedded?.['author']?.[0]?.slug || '',
            description: post._embedded?.['author']?.[0]?.description || '',
            avatar: {
              url: post._embedded?.['author']?.[0]?.avatar_urls?.['96'] || '',
            },
          },
        },
        categories: {
          nodes:
            post._embedded?.['wp:term']?.[0]?.map((cat: any) => ({
              name: cat.name,
              slug: cat.slug,
            })) || [],
        },
        tags: {
          nodes:
            post._embedded?.['wp:term']?.[1]?.map((tag: any) => ({
              name: tag.name,
              slug: tag.slug,
            })) || [],
        },
        seo: {
          title: post.title?.rendered || '',
          metaDesc: post.excerpt?.rendered?.replace(/<[^>]*>/g, '') || '',
        },
      },
    };
  };

  const data = await fetchWithFallback(query, { slug }, `single-post-${slug}`, restFallback);
  return data.post;
};

/**
 * Search posts
 */
export const searchPosts = async (query: string, page = 1, perPage = 20) => {
  const graphqlQuery = `
    query SearchPosts($search: String!, $first: Int!, $after: String) {
      posts(
        where: { search: $search, status: PUBLISH }
        first: $first
        after: $after
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          author {
            node {
              name
              slug
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
        }
      }
    }
  `;

  const restFallback = async () => {
    const posts = await fetchFromRestApi('posts', {
      search: query,
      per_page: perPage,
      page,
      _embed: 1,
    });

    return {
      posts: {
        pageInfo: {
          hasNextPage: posts.length >= perPage,
          endCursor: null,
        },
        nodes: posts.map((post: any) => ({
          id: post.id.toString(),
          title: post.title?.rendered || '',
          slug: post.slug || '',
          date: post.date || '',
          excerpt: post.excerpt?.rendered || '',
          featuredImage: post._embedded?.['wp:featuredmedia']?.[0]
            ? {
                node: {
                  sourceUrl: post._embedded['wp:featuredmedia'][0].source_url,
                  altText: post._embedded['wp:featuredmedia'][0].alt_text || '',
                },
              }
            : null,
          author: {
            node: {
              name: post._embedded?.['author']?.[0]?.name || 'Unknown',
              slug: post._embedded?.['author']?.[0]?.slug || '',
            },
          },
          categories: {
            nodes:
              post._embedded?.['wp:term']?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
        })),
      },
    };
  };

  const after = page > 1 ? btoa(`arrayconnection:${(page - 1) * perPage - 1}`) : null;
  const data = await fetchWithFallback(
    graphqlQuery,
    { search: query, first: perPage, after },
    `search-${query}-${page}`,
    restFallback,
  );

  return data.posts;
};

// Convenience exports matching legacy API
export const fetchFeaturedPosts = fetchRecentPosts;
export const fetchCategorizedPosts = async () => ({});
export const fetchAllPosts = fetchRecentPosts;
export const fetchAllTags = async () => [];
export const fetchAllAuthors = async () => [];
export const fetchPosts = async (options?: any) => {
  if (typeof options === 'number') {
    const result = await fetchRecentPosts(options);
    return { data: result.posts, pageInfo: { hasNextPage: result.hasNextPage, endCursor: result.endCursor } };
  }

  const limit = options?.perPage || options?.limit || 20;
  const page = options?.page || 1;
  const offset = (page - 1) * limit;
  const after = offset > 0 ? Buffer.from(`arrayconnection:${offset - 1}`).toString('base64') : null;

  // For now we ignore category, tag, search filters and just return recent posts
  const result = await fetchRecentPosts(limit, after);
  return {
    data: result.posts,
    pageInfo: { hasNextPage: result.hasNextPage, endCursor: result.endCursor },
  };
};
export const fetchCategories = fetchAllCategories;
export const fetchTags = fetchAllTags;
export const fetchAuthors = fetchAllAuthors;

export const clearApiCache = () => {
  apiCache.clear();
};

export const getCacheStats = () => {
  return {
    size: apiCache.size,
  };
};

/**
 * Fetch author data
 */
export const fetchAuthorData = cache(async (slug: string, _after: string | null = null) => {
  const author = await fetchFromRestApi('users', { slug });
  if (!author || author.length === 0) return null;
  const posts = await fetchFromRestApi('posts', { author: author[0].id, _embed: 1 });
  return {
    author: author[0],
    posts,
  };
});

/**
 * Delete a comment
 */
export const deleteComment = async (commentId: string) => {
  const response = await fetch(`${WORDPRESS_REST_API_URL}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.WP_JWT_TOKEN || ''}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.statusText}`);
  }
  return true;
};

/**
 * Fetch pending comments
 */
export const fetchPendingComments = async () => {
  return fetchFromRestApi('comments', { status: 'hold', per_page: 100 });
};

/**
 * Approve a comment
 */
export const approveComment = async (commentId: string) => {
  const response = await fetch(`${WORDPRESS_REST_API_URL}/comments/${commentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WP_JWT_TOKEN || ''}`,
    },
    body: JSON.stringify({ status: 'approve' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to approve comment: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Fetch posts by tag
 */
export const fetchTaggedPosts = cache(async (tagSlug: string, limit = 20) => {
  const query = `
    query TaggedPosts($slug: String!, $first: Int!) {
      posts(where: { tag: $slug }, first: $first) {
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          author {
            node {
              name
              slug
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
        }
      }
    }
  `;

  const restFallback = async () => {
    const tag = await fetchFromRestApi('tags', { slug: tagSlug });
    if (!tag || tag.length === 0) {
      return { posts: { nodes: [] } };
    }
    const posts = await fetchFromRestApi('posts', { tags: tag[0].id, per_page: limit, _embed: 1 });
    return {
      posts: {
        nodes: posts.map(transformRestPostToGraphQL),
      },
    };
  };

  const data = await fetchWithFallback(
    query,
    { slug: tagSlug, first: limit },
    `tagged-posts-${tagSlug}-${limit}`,
    restFallback,
  );
  return data.posts.nodes;
});

export const fetchPostsByTag = fetchTaggedPosts;

/**
 * Fetch a single category
 */
export const fetchSingleCategory = cache(async (slug: string) => {
  const categories = await fetchAllCategories();
  return categories.find((c: any) => c.slug === slug) || null;
});

/**
 * Fetch a single tag
 */
export const fetchSingleTag = cache(async (slug: string) => {
  const tag = await fetchFromRestApi('tags', { slug });
  return tag && tag.length ? tag[0] : null;
});

/**
 * Fetch comments for a post
 */
export const fetchComments = async (postId: string, page = 1, perPage = 20) => {
  return fetchFromRestApi('comments', { post: postId, page, per_page: perPage });
};

export const client = {
  query: (query: string, variables?: Record<string, any>) => graphqlRequest<any>(query, variables),
  request: (query: string, variables?: Record<string, any>) =>
    graphqlRequest<any>(query, variables),
  endpoint: WORDPRESS_GRAPHQL_URL,
  restEndpoint: WORDPRESS_REST_API_URL,
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, profileData: any) => {
  try {
    const response = await fetch(`${WORDPRESS_REST_API_URL}/users/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WP_JWT_TOKEN || ''}`,
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user profile: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**

 * Pick top story preferring posts tagged with "fp"
 */
export function pickTopStory(posts: WordPressPost[]): WordPressPost | null {
  if (!posts.length) return null;
  const featured = posts.find((p) =>
    p.tags?.nodes?.some((t) => t.slug === 'fp' || t.name?.toLowerCase() === 'fp'),
  );
  return featured || posts[0];
}

/**
 * Get the top story from latest posts
 */
export async function getTopStory(): Promise<WordPressPost | null> {
  const { posts } = await getLatestPosts(10);
  return pickTopStory(posts);
}

/**
 * Sort posts by date descending
 */
export function sortPostsByDate(posts: WordPressPost[]): WordPressPost[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Temporary Most Read implementation using latest posts
 * TODO: Replace with analytics-driven endpoint
 */
export async function getMostRead(limit = 10): Promise<WordPressPost[]> {
  const { posts } = await getLatestPosts(limit);
  return sortPostsByDate(posts).slice(0, limit);
}

export type MarketItem = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
};

export async function getMarketSnapshot(): Promise<MarketItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (baseUrl) {
      const url = `${baseUrl.replace(/\/$/, '')}/markets.json`;
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) {
        throw new Error(`Failed to fetch market snapshot: ${res.status}`);
      }
      return await res.json();
    }

    const filePath = path.join(process.cwd(), 'public', 'markets.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as MarketItem[];
  } catch (error) {
    console.error('Error loading market snapshot:', error);
    return [];
  }
}

export type PollOption = { id: string; label: string; votes: number };

export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  userHasVoted?: boolean;
};

// Temporary static poll implementation
export async function getPoll(): Promise<Poll> {
  return {
    id: 'static',
    question: 'Do you like the new homepage?',
    options: [
      { id: 'yes', label: 'Yes', votes: 0 },
      { id: 'no', label: 'No', votes: 0 },
    ],
  };
}

export async function votePoll(_optionId: string): Promise<void> {
  // TODO: wire up real poll voting
  return;
}

// Transform functions for REST API data
// Export types for use in other files
export type {
  WordPressPost,
  WordPressCategory,
  WordPressAuthor,
  WordPressTag,
  WordPressImage,
  CountryConfig,
};
