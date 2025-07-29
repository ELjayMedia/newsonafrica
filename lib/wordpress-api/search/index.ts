import { searchCache, SEARCH_CACHE_TTL, SUGGESTION_CACHE_TTL } from "../cache"
import { fetchCategoryPosts, fetchRecentPosts, fetchFromRestApi, fetchWithFallback } from "../fetch"
import type { Post } from "../utils"

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
 * Search by categories with enhanced filtering. Fetches each category in
 * parallel to reduce overall latency compared to sequential requests.
 */
async function searchByCategories(query: string, options: SearchOptions): Promise<Post[]> {
  const { categories = [] } = options

  if (categories.length === 0) return []

  // Fetch posts for all categories concurrently. Running these requests in
  // parallel cuts down the overall search time compared to awaiting each
  // category sequentially.
  const fetchPromises = categories.map((categorySlug) =>
    fetchCategoryPosts(categorySlug)
      .then((categoryPosts) =>
        categoryPosts.posts.nodes.filter(
          (post: Post) =>
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(query.toLowerCase()),
        ),
      )
      .catch((error) => {
        console.error(`Failed to search in category ${categorySlug}:`, error)
        return []
      }),
  )

  const results = (await Promise.all(fetchPromises)).flat()
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
    const posts = await fetchRecentPosts(50)

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

