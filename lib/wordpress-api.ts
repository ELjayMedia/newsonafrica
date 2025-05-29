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
export const fetchRecentPosts = cache(async (limit = 20) => {
  const query = `
    query RecentPosts($limit: Int!) {
      posts(first: $limit, where: { orderby: { field: DATE, order: DESC }, status: PUBLISH }) {
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
  `

  const restFallback = async () => {
    const posts = await fetchFromRestApi("posts", {
      per_page: limit,
      _embed: 1,
      orderby: "date",
      order: "desc",
    })

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
      },
    }
  }

  const data = await fetchWithFallback(query, { limit }, `recent-posts-${limit}`, restFallback)
  return data.posts?.nodes || []
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
