import { cache } from "react"

const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://newsonafrica.com/sz/graphql"
const WORDPRESS_REST_API_URL = process.env.WORDPRESS_REST_API_URL || "https://newsonafrica.com/sz/wp-json/wp/v2"

if (!WORDPRESS_API_URL) {
  console.error("NEXT_PUBLIC_WORDPRESS_API_URL is not set in the environment variables.")
}

// Simple cache implementation
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

// Check if we're in a server environment
const isServer = () => typeof window === "undefined"

/**
 * Simple GraphQL request function with proper headers
 */
async function graphqlRequest(query: string, variables: Record<string, any> = {}) {
  const response = await fetch(WORDPRESS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "NewsOnAfrica/1.0",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
  }

  return result.data
}

/**
 * Fetches data from the WordPress REST API with retry logic.
 */
const fetchFromRestApi = async (endpoint: string, params: Record<string, any> = {}) => {
  const queryParams = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()

  const url = `${WORDPRESS_REST_API_URL}/${endpoint}${queryParams ? `?${queryParams}` : ""}`

  const MAX_RETRIES = 3
  let lastError

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "NewsOnAfrica/1.0",
        },
        signal: controller.signal,
        next: { revalidate: 300 }, // 5 minutes
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`REST API request attempt ${attempt + 1} failed:`, error)
      lastError = error

      if (attempt === MAX_RETRIES - 1) {
        throw error
      }

      // Exponential backoff
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 5000)
      await new Promise((resolve) => setTimeout(resolve, backoffTime))
    }
  }

  throw lastError
}

/**
 * Fetches data with caching and fallback to REST API
 */
const fetchWithFallback = async (
  query: string,
  variables: Record<string, any> = {},
  cacheKey: string,
  restFallback: () => Promise<any>,
) => {
  // Check cache first
  const cached = apiCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }

  // If offline, try cache or return empty
  if (!isServer() && !isOnline()) {
    console.log("Device is offline, using cache or returning empty data")
    return cached?.data || []
  }

  try {
    // Try GraphQL first
    const data = await graphqlRequest(query, variables)

    // Cache the result
    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
    })

    return data
  } catch (error) {
    console.error("GraphQL request failed, falling back to REST API:", error)

    try {
      // Fallback to REST API
      const restData = await restFallback()

      // Cache the REST result
      apiCache.set(cacheKey, {
        data: restData,
        timestamp: Date.now(),
        ttl: CACHE_TTL,
      })

      return restData
    } catch (restError) {
      console.error("Both GraphQL and REST API failed:", restError)

      // Return cached data if available, otherwise empty
      return cached?.data || []
    }
  }
}

/**
 * Fetches recent posts
 */
export const fetchRecentPosts = cache(async (limit = 20, offset = 0) => {
  const query = `
    query RecentPosts($limit: Int!, $offset: Int!) {
      posts(
        where: {
          offsetPagination: { offset: $offset, size: $limit }
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
          offsetPagination {
            total
          }
        }
      }
    }
  `

  const restFallback = async () => {
    const params = new URLSearchParams({
      per_page: String(limit),
      offset: String(offset),
      _embed: "1",
      orderby: "date",
      order: "desc",
    })

    const url = `${WORDPRESS_REST_API_URL}/posts?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "NewsOnAfrica/1.0",
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`REST API error: ${response.status} ${response.statusText}`)
    }

    const total = parseInt(response.headers.get("X-WP-Total") || "0", 10)
    const posts = await response.json()

    return {
      posts: {
        nodes: posts.map((post: any) => ({
          id: post.id.toString(),
          title: post.title?.rendered || "",
          slug: post.slug || "",
          date: post.date || "",
          excerpt: post.excerpt?.rendered || "",
          featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
            ? {
                node: {
                  sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                  altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                },
              }
            : null,
          author: {
            node: {
              name: post._embedded?.["author"]?.[0]?.name || "Unknown",
              slug: post._embedded?.["author"]?.[0]?.slug || "",
            },
          },
          categories: {
            nodes:
              post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
          tags: {
            nodes:
              post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                name: tag.name,
                slug: tag.slug,
              })) || [],
          },
        })),
        pageInfo: {
          offsetPagination: {
            total,
          },
        },
      },
    }
  }

  const data = await fetchWithFallback(
    query,
    { limit, offset },
    `recent-posts-${limit}-${offset}`,
    restFallback,
  )

  return {
    posts: data.posts?.nodes || [],
    total: data.posts?.pageInfo?.offsetPagination?.total || 0,
  }
})

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
  `

  const restFallback = async () => {
    try {
      // Get category ID from slug
      const categories = await fetchFromRestApi("categories", { slug })
      if (!categories || categories.length === 0) {
        throw new Error(`Category not found: ${slug}`)
      }

      const categoryId = categories[0].id
      const categoryData = categories[0]

      // Get posts for this category
      const posts = await fetchFromRestApi("posts", {
        categories: categoryId,
        per_page: 20,
        _embed: 1,
      })

      return {
        category: {
          id: categoryData.id.toString(),
          name: categoryData.name,
          description: categoryData.description || "",
          posts: {
            pageInfo: {
              hasNextPage: posts.length >= 20,
              endCursor: null,
            },
            nodes: posts.map((post: any) => ({
              id: post.id.toString(),
              title: post.title?.rendered || "",
              slug: post.slug || "",
              date: post.date || "",
              excerpt: post.excerpt?.rendered || "",
              featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
                ? {
                    node: {
                      sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                      altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                    },
                  }
                : null,
              author: {
                node: {
                  name: post._embedded?.["author"]?.[0]?.name || "Unknown",
                  slug: post._embedded?.["author"]?.[0]?.slug || "",
                },
              },
              categories: {
                nodes:
                  post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                    name: cat.name,
                    slug: cat.slug,
                  })) || [],
              },
              tags: {
                nodes:
                  post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                    name: tag.name,
                    slug: tag.slug,
                  })) || [],
              },
            })),
          },
        },
      }
    } catch (error) {
      console.error(`Failed to fetch category ${slug}:`, error)
      return {
        category: {
          id: "",
          name: slug,
          description: "",
          posts: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        },
      }
    }
  }

  const data = await fetchWithFallback(query, { slug, after }, `category-${slug}-${after || "first"}`, restFallback)
  return data.category
})

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
  `

  const restFallback = async () => {
    const categories = await fetchFromRestApi("categories", { per_page: 100, hide_empty: true })
    return {
      categories: {
        nodes: categories.map((cat: any) => ({
          id: cat.id.toString(),
          name: cat.name,
          slug: cat.slug,
          description: cat.description || "",
          count: cat.count || 0,
        })),
      },
    }
  }

  const data = await fetchWithFallback(query, {}, "all-categories", restFallback)
  return data.categories?.nodes || []
})

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
  `

  const restFallback = async () => {
    const posts = await fetchFromRestApi(`posts?slug=${slug}&_embed=1`)

    if (!posts || posts.length === 0) {
      return { post: null }
    }

    const post = posts[0]
    return {
      post: {
        id: post.id.toString(),
        title: post.title?.rendered || "",
        content: post.content?.rendered || "",
        excerpt: post.excerpt?.rendered || "",
        slug: post.slug || "",
        date: post.date || "",
        modified: post.modified || "",
        featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
          ? {
              node: {
                sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
              },
            }
          : null,
        author: {
          node: {
            name: post._embedded?.["author"]?.[0]?.name || "Unknown",
            slug: post._embedded?.["author"]?.[0]?.slug || "",
            description: post._embedded?.["author"]?.[0]?.description || "",
            avatar: {
              url: post._embedded?.["author"]?.[0]?.avatar_urls?.["96"] || "",
            },
          },
        },
        categories: {
          nodes:
            post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
              name: cat.name,
              slug: cat.slug,
            })) || [],
        },
        tags: {
          nodes:
            post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
              name: tag.name,
              slug: tag.slug,
            })) || [],
        },
        seo: {
          title: post.title?.rendered || "",
          metaDesc: post.excerpt?.rendered?.replace(/<[^>]*>/g, "") || "",
        },
      },
    }
  }

  const data = await fetchWithFallback(query, { slug }, `single-post-${slug}`, restFallback)
  return data.post
}

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
  `

  const restFallback = async () => {
    const posts = await fetchFromRestApi("posts", {
      search: query,
      per_page: perPage,
      page,
      _embed: 1,
    })

    return {
      posts: {
        pageInfo: {
          hasNextPage: posts.length >= perPage,
          endCursor: null,
        },
        nodes: posts.map((post: any) => ({
          id: post.id.toString(),
          title: post.title?.rendered || "",
          slug: post.slug || "",
          date: post.date || "",
          excerpt: post.excerpt?.rendered || "",
          featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
            ? {
                node: {
                  sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                  altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                },
              }
            : null,
          author: {
            node: {
              name: post._embedded?.["author"]?.[0]?.name || "Unknown",
              slug: post._embedded?.["author"]?.[0]?.slug || "",
            },
          },
          categories: {
            nodes:
              post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
        })),
      },
    }
  }

  const after = page > 1 ? btoa(`arrayconnection:${(page - 1) * perPage - 1}`) : null
  const data = await fetchWithFallback(
    graphqlQuery,
    { search: query, first: perPage, after },
    `search-${query}-${page}`,
    restFallback,
  )

  return data.posts
}

// Enhanced search functionality with performance optimizations
interface SearchOptions {
  page?: number
  perPage?: number
  categories?: string[]
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  includeParallel?: boolean
  sortBy?: "relevance" | "date" | "title"
}

interface SearchResponse {
  items: Post[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
    hasMore: boolean
  }
  searchSource: string
  performance: {
    responseTime: number
    cached: boolean
    parallel?: boolean
  }
}

// Advanced caching with search-specific optimization
const searchCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
const SEARCH_CACHE_TTL = 10 * 60 * 1000 // 10 minutes for search results
const SUGGESTION_CACHE_TTL = 30 * 60 * 1000 // 30 minutes for suggestions

/**
 * Optimized WordPress search with parallel execution and smart caching
 */
export async function optimizedWordPressSearch(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const startTime = Date.now()
  const {
    page = 1,
    perPage = 20,
    categories = [],
    tags = [],
    dateFrom,
    dateTo,
    includeParallel = false,
    sortBy = "relevance",
  } = options

  // Create cache key
  const cacheKey = `search:${query}:${JSON.stringify(options)}`

  // Check cache first
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return {
      ...cached.data,
      performance: {
        ...cached.data.performance,
        responseTime: Date.now() - startTime,
        cached: true,
      },
    }
  }

  try {
    let searchResults: SearchResponse

    if (includeParallel) {
      // Parallel search execution for better performance
      searchResults = await executeParallelSearch(query, options)
    } else {
      // Standard optimized search
      searchResults = await executeOptimizedSearch(query, options)
    }

    // Cache the results
    searchCache.set(cacheKey, {
      data: searchResults,
      timestamp: Date.now(),
      ttl: SEARCH_CACHE_TTL,
    })

    return {
      ...searchResults,
      performance: {
        ...searchResults.performance,
        responseTime: Date.now() - startTime,
        cached: false,
      },
    }
  } catch (error) {
    console.error("Optimized search failed:", error)
    throw error
  }
}

/**
 * Execute parallel search across multiple endpoints
 */
async function executeParallelSearch(query: string, options: SearchOptions): Promise<SearchResponse> {
  const { page = 1, perPage = 20 } = options

  // Execute multiple search strategies in parallel
  const searchPromises = [
    // GraphQL search
    searchViaGraphQL(query, options),
    // REST API search
    searchViaREST(query, options),
    // Category-specific search if categories are specified
    ...(options.categories?.length ? [searchByCategories(query, options)] : []),
  ]

  try {
    // Wait for all searches to complete or timeout
    const results = await Promise.allSettled(
      searchPromises.map((promise) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Search timeout")), 8000)),
        ]),
      ),
    )

    // Combine and deduplicate results
    const allPosts: Post[] = []
    const seenIds = new Set<string>()

    results.forEach((result) => {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        result.value.forEach((post: Post) => {
          if (!seenIds.has(post.id)) {
            seenIds.add(post.id)
            allPosts.push(post)
          }
        })
      }
    })

    // Sort results by relevance or specified criteria
    const sortedPosts = sortSearchResults(allPosts, query, options.sortBy)

    // Apply pagination
    const startIndex = (page - 1) * perPage
    const paginatedPosts = sortedPosts.slice(startIndex, startIndex + perPage)

    return {
      items: paginatedPosts,
      pagination: {
        page,
        perPage,
        totalItems: sortedPosts.length,
        totalPages: Math.ceil(sortedPosts.length / perPage),
        hasMore: page < Math.ceil(sortedPosts.length / perPage),
      },
      searchSource: "parallel",
      performance: {
        responseTime: 0, // Will be set by caller
        cached: false,
        parallel: true,
      },
    }
  } catch (error) {
    console.error("Parallel search failed:", error)
    throw error
  }
}

/**
 * Execute optimized single search
 */
async function executeOptimizedSearch(query: string, options: SearchOptions): Promise<SearchResponse> {
  const { page = 1, perPage = 20 } = options

  try {
    // Try GraphQL first (usually faster)
    const posts = await searchViaGraphQL(query, options)

    // Apply sorting
    const sortedPosts = sortSearchResults(posts, query, options.sortBy)

    // Apply pagination
    const startIndex = (page - 1) * perPage
    const paginatedPosts = sortedPosts.slice(startIndex, startIndex + perPage)

    return {
      items: paginatedPosts,
      pagination: {
        page,
        perPage,
        totalItems: sortedPosts.length,
        totalPages: Math.ceil(sortedPosts.length / perPage),
        hasMore: page < Math.ceil(sortedPosts.length / perPage),
      },
      searchSource: "graphql-optimized",
      performance: {
        responseTime: 0, // Will be set by caller
        cached: false,
      },
    }
  } catch (error) {
    console.error("GraphQL search failed, falling back to REST:", error)

    // Fallback to REST API
    const posts = await searchViaREST(query, options)
    const sortedPosts = sortSearchResults(posts, query, options.sortBy)
    const startIndex = (page - 1) * perPage
    const paginatedPosts = sortedPosts.slice(startIndex, startIndex + perPage)

    return {
      items: paginatedPosts,
      pagination: {
        page,
        perPage,
        totalItems: sortedPosts.length,
        totalPages: Math.ceil(sortedPosts.length / perPage),
        hasMore: page < Math.ceil(sortedPosts.length / perPage),
      },
      searchSource: "rest-fallback",
      performance: {
        responseTime: 0,
        cached: false,
      },
    }
  }
}

/**
 * Search via GraphQL with optimized query
 */
async function searchViaGraphQL(query: string, options: SearchOptions): Promise<Post[]> {
  const { categories = [], tags = [], dateFrom, dateTo } = options

  // Build optimized GraphQL query
  const searchQuery = `
    query OptimizedSearch($search: String!, $first: Int!, $categoryIn: [ID], $tagIn: [ID], $dateQuery: DateQueryInput) {
      posts(
        where: { 
          search: $search,
          status: PUBLISH,
          categoryIn: $categoryIn,
          tagIn: $tagIn,
          dateQuery: $dateQuery
        }
        first: $first
      ) {
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl(size: MEDIUM)
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
  `

  // Build date query if provided
  let dateQuery = null
  if (dateFrom || dateTo) {
    dateQuery = {
      after: dateFrom,
      before: dateTo,
      inclusive: true,
    }
  }

  const variables = {
    search: query,
    first: 100, // Get more results for better sorting
    categoryIn: categories.length > 0 ? categories : undefined,
    tagIn: tags.length > 0 ? tags : undefined,
    dateQuery,
  }

  const data = await graphqlRequest(searchQuery, variables)
  return data.posts?.nodes || []
}

/**
 * Search via REST API with optimized parameters
 */
async function searchViaREST(query: string, options: SearchOptions): Promise<Post[]> {
  const { categories = [], tags = [], dateFrom, dateTo } = options

  const params: Record<string, any> = {
    search: query,
    per_page: 100,
    _embed: 1,
    orderby: "relevance",
    status: "publish",
  }

  // Add category filter
  if (categories.length > 0) {
    params.categories = categories.join(",")
  }

  // Add tag filter
  if (tags.length > 0) {
    params.tags = tags.join(",")
  }

  // Add date filters
  if (dateFrom) {
    params.after = dateFrom
  }
  if (dateTo) {
    params.before = dateTo
  }

  const posts = await fetchFromRestApi("posts", params)

  return posts.map((post: any) => ({
    id: post.id.toString(),
    title: post.title?.rendered || "",
    slug: post.slug || "",
    date: post.date || "",
    excerpt: post.excerpt?.rendered || "",
    featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
      ? {
          node: {
            sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
            altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
          },
        }
      : null,
    author: {
      node: {
        name: post._embedded?.["author"]?.[0]?.name || "Unknown",
        slug: post._embedded?.["author"]?.[0]?.slug || "",
      },
    },
    categories: {
      nodes:
        post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
          name: cat.name,
          slug: cat.slug,
        })) || [],
    },
    tags: {
      nodes:
        post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
          name: tag.name,
          slug: tag.slug,
        })) || [],
    },
  }))
}

/**
 * Search by categories with enhanced filtering
 */
async function searchByCategories(query: string, options: SearchOptions): Promise<Post[]> {
  const { categories = [] } = options

  if (categories.length === 0) return []

  const results: Post[] = []

  // Search within each category
  for (const categorySlug of categories) {
    try {
      const categoryPosts = await fetchCategoryPosts(categorySlug)

      // Filter posts that match the search query
      const matchingPosts = categoryPosts.posts.nodes.filter(
        (post: Post) =>
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(query.toLowerCase()),
      )

      results.push(...matchingPosts)
    } catch (error) {
      console.error(`Failed to search in category ${categorySlug}:`, error)
    }
  }

  return results
}

/**
 * Sort search results by relevance or other criteria
 */
function sortSearchResults(posts: Post[], query: string, sortBy = "relevance"): Post[] {
  if (sortBy === "date") {
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  if (sortBy === "title") {
    return posts.sort((a, b) => a.title.localeCompare(b.title))
  }

  // Default: relevance sorting
  return posts.sort((a, b) => {
    const aScore = calculateRelevanceScore(a, query)
    const bScore = calculateRelevanceScore(b, query)
    return bScore - aScore
  })
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(post: Post, query: string): number {
  const queryLower = query.toLowerCase()
  let score = 0

  // Title matches (highest weight)
  if (post.title.toLowerCase().includes(queryLower)) {
    score += 10
    // Exact title match gets bonus
    if (post.title.toLowerCase() === queryLower) {
      score += 20
    }
    // Title starts with query gets bonus
    if (post.title.toLowerCase().startsWith(queryLower)) {
      score += 15
    }
  }

  // Excerpt matches (medium weight)
  if (post.excerpt.toLowerCase().includes(queryLower)) {
    score += 5
  }

  // Category matches (low weight)
  post.categories.nodes.forEach((category) => {
    if (category.name.toLowerCase().includes(queryLower)) {
      score += 2
    }
  })

  // Tag matches (low weight)
  if (post.tags) {
    post.tags.nodes.forEach((tag) => {
      if (tag.name.toLowerCase().includes(queryLower)) {
        score += 1
      }
    })
  }

  // Recent posts get slight bonus
  const daysSincePublished = (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSincePublished < 7) {
    score += 1
  }

  return score
}

/**
 * Get search suggestions with caching
 */
export async function getWordPressSearchSuggestions(query: string, limit = 8): Promise<string[]> {
  const cacheKey = `suggestions:${query}:${limit}`

  // Check cache
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < SUGGESTION_CACHE_TTL) {
    return cached.data
  }

  try {
    // Get recent posts for suggestions
    const { posts } = await fetchRecentPosts(50)

    // Extract potential suggestions
    const suggestions = new Set<string>()

    posts.forEach((post) => {
      // Add title words
      const titleWords = post.title.toLowerCase().split(/\s+/)
      titleWords.forEach((word) => {
        if (word.length > 3 && word.includes(query.toLowerCase())) {
          suggestions.add(word)
        }
      })

      // Add category names
      post.categories.nodes.forEach((category) => {
        if (category.name.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(category.name)
        }
      })

      // Add tag names
      if (post.tags) {
        post.tags.nodes.forEach((tag) => {
          if (tag.name.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(tag.name)
          }
        })
      }
    })

    const suggestionArray = Array.from(suggestions).slice(0, limit)

    // Cache suggestions
    searchCache.set(cacheKey, {
      data: suggestionArray,
      timestamp: Date.now(),
      ttl: SUGGESTION_CACHE_TTL,
    })

    return suggestionArray
  } catch (error) {
    console.error("Failed to get search suggestions:", error)
    return []
  }
}

/**
 * Clear search cache
 */
export function clearSearchCache(): void {
  searchCache.clear()
}

/**
 * Get search cache statistics
 */
export function getSearchCacheStats() {
  return {
    size: searchCache.size,
    keys: Array.from(searchCache.keys()),
  }
}

// Keep existing function names for backward compatibility
export const fetchFeaturedPosts = fetchRecentPosts
export const fetchCategorizedPosts = async () => {
  const categories = await fetchAllCategories()
  return categories.slice(0, 10) // Return top 10 categories
}

export const fetchAllPosts = fetchRecentPosts
export const fetchAllTags = async () => []
export const fetchAllAuthors = async () => []
export const fetchPosts = fetchRecentPosts
export const fetchCategories = fetchAllCategories
export const fetchTags = fetchAllTags
export const fetchAuthors = fetchAllAuthors

// Clear cache function
export const clearApiCache = () => {
  apiCache.clear()
}

// Get cache stats
export const getCacheStats = () => {
  return {
    size: apiCache.size,
    keys: Array.from(apiCache.keys()),
  }
}

/**
 * Fetch author data by slug
 */
export const fetchAuthorData = cache(async (slug: string) => {
  const query = `
    query AuthorData($slug: ID!) {
      user(id: $slug, idType: SLUG) {
        id
        name
        slug
        description
        avatar {
          url
        }
        posts(first: 20, where: { status: PUBLISH }) {
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
            categories {
              nodes {
                name
                slug
              }
            }
          }
        }
      }
    }
  `

  const restFallback = async () => {
    try {
      const users = await fetchFromRestApi(`users?slug=${slug}`)
      if (!users || users.length === 0) {
        return { user: null }
      }

      const user = users[0]
      const posts = await fetchFromRestApi(`posts?author=${user.id}&_embed=1`)

      return {
        user: {
          id: user.id.toString(),
          name: user.name,
          slug: user.slug,
          description: user.description || "",
          avatar: {
            url: user.avatar_urls?.["96"] || "",
          },
          posts: {
            nodes: posts.map((post: any) => ({
              id: post.id.toString(),
              title: post.title?.rendered || "",
              slug: post.slug || "",
              date: post.date || "",
              excerpt: post.excerpt?.rendered || "",
              featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
                ? {
                    node: {
                      sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                      altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                    },
                  }
                : null,
              categories: {
                nodes:
                  post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                    name: cat.name,
                    slug: cat.slug,
                  })) || [],
              },
            })),
          },
        },
      }
    } catch (error) {
      console.error(`Failed to fetch author ${slug}:`, error)
      return { user: null }
    }
  }

  const data = await fetchWithFallback(query, { slug }, `author-${slug}`, restFallback)
  return data.user
})

/**
 * Delete a comment
 */
export const deleteComment = async (commentId: string) => {
  try {
    const response = await fetch(`${WORDPRESS_REST_API_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WP_JWT_TOKEN || ""}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error deleting comment:", error)
    throw error
  }
}

/**
 * Fetch pending comments for moderation
 */
export const fetchPendingComments = async () => {
  try {
    const comments = await fetchFromRestApi("comments", {
      status: "hold",
      per_page: 50,
      _embed: 1,
    })

    return comments.map((comment: any) => ({
      id: comment.id.toString(),
      content: comment.content?.rendered || "",
      author: comment.author_name || "Anonymous",
      email: comment.author_email || "",
      date: comment.date || "",
      status: comment.status || "pending",
      post: {
        id: comment.post?.toString() || "",
        title: comment._embedded?.up?.[0]?.title?.rendered || "",
      },
    }))
  } catch (error) {
    console.error("Error fetching pending comments:", error)
    return []
  }
}

/**
 * Approve a comment
 */
export const approveComment = async (commentId: string) => {
  try {
    const response = await fetch(`${WORDPRESS_REST_API_URL}/comments/${commentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WP_JWT_TOKEN || ""}`,
      },
      body: JSON.stringify({
        status: "approved",
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to approve comment: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error approving comment:", error)
    throw error
  }
}

/**
 * Fetch posts by tag
 */
export const fetchTaggedPosts = cache(async (tagSlug: string, limit = 20) => {
  const query = `
    query TaggedPosts($tagSlug: ID!, $limit: Int!) {
      tag(id: $tagSlug, idType: SLUG) {
        id
        name
        posts(first: $limit, where: { status: PUBLISH }) {
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
    }
  `

  const restFallback = async () => {
    try {
      const tags = await fetchFromRestApi("tags", { slug: tagSlug })
      if (!tags || tags.length === 0) {
        return { tag: { posts: { nodes: [] } } }
      }

      const tagId = tags[0].id
      const posts = await fetchFromRestApi("posts", {
        tags: tagId,
        per_page: limit,
        _embed: 1,
      })

      return {
        tag: {
          id: tagId.toString(),
          name: tags[0].name,
          posts: {
            nodes: posts.map((post: any) => ({
              id: post.id.toString(),
              title: post.title?.rendered || "",
              slug: post.slug || "",
              date: post.date || "",
              excerpt: post.excerpt?.rendered || "",
              featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
                ? {
                    node: {
                      sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                      altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                    },
                  }
                : null,
              author: {
                node: {
                  name: post._embedded?.["author"]?.[0]?.name || "Unknown",
                  slug: post._embedded?.["author"]?.[0]?.slug || "",
                },
              },
              categories: {
                nodes:
                  post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                    name: cat.name,
                    slug: cat.slug,
                  })) || [],
              },
            })),
          },
        },
      }
    } catch (error) {
      console.error(`Failed to fetch tagged posts for ${tagSlug}:`, error)
      return { tag: { posts: { nodes: [] } } }
    }
  }

  const data = await fetchWithFallback(query, { tagSlug, limit }, `tagged-posts-${tagSlug}-${limit}`, restFallback)
  return data.tag?.posts?.nodes || []
})

/**
 * Alias for fetchTaggedPosts for backward compatibility
 */
export const fetchPostsByTag = fetchTaggedPosts

/**
 * Fetch single category data
 */
export const fetchSingleCategory = cache(async (slug: string) => {
  const query = `
    query SingleCategory($slug: ID!) {
      category(id: $slug, idType: SLUG) {
        id
        name
        slug
        description
        count
      }
    }
  `

  const restFallback = async () => {
    try {
      const categories = await fetchFromRestApi("categories", { slug })
      if (!categories || categories.length === 0) {
        return { category: null }
      }

      const category = categories[0]
      return {
        category: {
          id: category.id.toString(),
          name: category.name,
          slug: category.slug,
          description: category.description || "",
          count: category.count || 0,
        },
      }
    } catch (error) {
      console.error(`Failed to fetch category ${slug}:`, error)
      return { category: null }
    }
  }

  const data = await fetchWithFallback(query, { slug }, `single-category-${slug}`, restFallback)
  return data.category
})

/**
 * Fetch single tag data
 */
export const fetchSingleTag = cache(async (slug: string) => {
  const query = `
    query SingleTag($slug: ID!) {
      tag(id: $slug, idType: SLUG) {
        id
        name
        slug
        description
        count
      }
    }
  `

  const restFallback = async () => {
    try {
      const tags = await fetchFromRestApi("tags", { slug })
      if (!tags || tags.length === 0) {
        return { tag: null }
      }

      const tag = tags[0]
      return {
        tag: {
          id: tag.id.toString(),
          name: tag.name,
          slug: tag.slug,
          description: tag.description || "",
          count: tag.count || 0,
        },
      }
    } catch (error) {
      console.error(`Failed to fetch tag ${slug}:`, error)
      return { tag: null }
    }
  }

  const data = await fetchWithFallback(query, { slug }, `single-tag-${slug}`, restFallback)
  return data.tag
})

/**
 * Fetch comments for a post
 */
export const fetchComments = async (postId: string, page = 1, perPage = 20) => {
  try {
    const comments = await fetchFromRestApi("comments", {
      post: postId,
      per_page: perPage,
      page,
      status: "approved",
      order: "asc",
      orderby: "date",
    })

    return comments.map((comment: any) => ({
      id: comment.id.toString(),
      content: comment.content?.rendered || "",
      author: comment.author_name || "Anonymous",
      email: comment.author_email || "",
      date: comment.date || "",
      status: comment.status || "approved",
      parent: comment.parent || 0,
    }))
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error)
    return []
  }
}

/**
 * WordPress GraphQL client instance
 */
export const client = {
  query: graphqlRequest,
  endpoint: WORDPRESS_API_URL,
  restEndpoint: WORDPRESS_REST_API_URL,
}

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, profileData: any) => {
  try {
    const response = await fetch(`${WORDPRESS_REST_API_URL}/users/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WP_JWT_TOKEN || ""}`,
      },
      body: JSON.stringify(profileData),
    })

    if (!response.ok) {
      throw new Error(`Failed to update user profile: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

export interface Post {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  modified?: string
  featuredImage?: {
    node: {
      sourceUrl: string
      altText: string
    }
  }
  author: {
    node: {
      name: string
      slug: string
      description?: string
      avatar?: {
        url: string
      }
    }
  }
  categories: {
    nodes: {
      name: string
      slug: string
    }[]
  }
  tags?: {
    nodes: {
      name: string
      slug: string
    }[]
  }
  seo?: {
    title: string
    metaDesc: string
  }
  content?: string
}
