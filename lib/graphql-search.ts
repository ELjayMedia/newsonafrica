/**
 * Utility functions for GraphQL search
 */

// Execute a GraphQL search query
export async function executeGraphQLSearch(
  query: string,
  options: {
    limit?: number
    offset?: number
    category?: string
  },
) {
  const { limit = 10, offset = 0, category } = options

  // Build GraphQL query
  const graphqlQuery = {
    query: `
      query SearchPosts($query: String!, $limit: Int, $offset: Int, $category: String) {
        search(query: $query, limit: $limit, offset: $offset, category: $category) {
          edges {
            id
            title
            slug
            excerpt
            date
            featuredImage {
              sourceUrl
              altText
            }
            author {
              name
              slug
            }
            categories {
              name
              slug
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `,
    variables: {
      query,
      limit,
      offset,
      category,
    },
  }

  try {
    // Execute GraphQL query
    const response = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(data.errors[0].message || "GraphQL error")
    }

    return data.data.search
  } catch (error) {
    console.error("GraphQL search error:", error)
    throw error
  }
}

// Format search results for display
export function formatSearchExcerpt(excerpt: string): string {
  // Remove HTML tags
  const text = excerpt.replace(/<\/?[^>]+(>|$)/g, "")

  // Decode HTML entities
  const decoded = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")

  // Trim and limit length
  return decoded.trim().length > 150 ? decoded.trim().substring(0, 150) + "..." : decoded.trim()
}

// Create a debounced search function
export function createDebouncedGraphQLSearch(delay = 300) {
  let timeoutId: NodeJS.Timeout | null = null
  let controller: AbortController | null = null

  return (
    query: string,
    options: { limit?: number; offset?: number; category?: string },
    callback: (result: any) => void,
  ) => {
    // Cancel previous request if any
    if (controller) {
      controller.abort()
    }

    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Set new timeout
    timeoutId = setTimeout(async () => {
      // Create new abort controller
      controller = new AbortController()

      try {
        // Perform search
        const result = await executeGraphQLSearch(query, options)
        callback(result)
      } catch (error) {
        callback({
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: 0,
          error: error instanceof Error ? error.message : "Search failed",
        })
      }

      // Reset controller
      controller = null
    }, delay)
  }
}
