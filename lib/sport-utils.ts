import { cache } from "react"
import { fetchCategoryPosts } from "./wordpress-api"
import { client } from "./wordpress-api"

// GraphQL query to fetch posts from both 'sport' and 'sports' categories
const SPORTS_QUERY = `
  query SportsPosts($limit: Int) {
    sportCategory: categories(where: {slug: "sport"}, first: 1) {
      nodes {
        posts(first: $limit) {
          nodes {
            id
            title
            excerpt
            slug
            date
            featuredImage {
              node {
                sourceUrl
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
    sportsCategory: categories(where: {slug: "sports"}, first: 1) {
      nodes {
        posts(first: $limit) {
          nodes {
            id
            title
            excerpt
            slug
            date
            featuredImage {
              node {
                sourceUrl
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
  }
`

export const fetchSportPosts = cache(async (limit = 5) => {
  try {
    // Try to fetch posts from both 'sport' and 'sports' categories
    const data = await client.request(SPORTS_QUERY, { limit })

    // Combine posts from both categories
    const sportPosts = data.sportCategory?.nodes?.[0]?.posts?.nodes || []
    const sportsPosts = data.sportsCategory?.nodes?.[0]?.posts?.nodes || []

    // Combine and deduplicate posts (in case a post is in both categories)
    const allPosts = [...sportPosts, ...sportsPosts]
    const uniquePosts = Array.from(new Set(allPosts.map((post) => post.id)))
      .map((id) => allPosts.find((post) => post.id === id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)

    return uniquePosts
  } catch (error) {
    console.error("Error fetching sport/sports posts:", error)

    // Fallback to individual category fetches if the combined query fails
    try {
      const [sportCategory, sportsCategory] = await Promise.allSettled([
        fetchCategoryPosts("sport", limit),
        fetchCategoryPosts("sports", limit),
      ])

      const sportPosts = sportCategory.status === "fulfilled" ? sportCategory.value?.posts?.nodes || [] : []
      const sportsPosts = sportsCategory.status === "fulfilled" ? sportsCategory.value?.posts?.nodes || [] : []

      // Combine and deduplicate posts
      const allPosts = [...sportPosts, ...sportsPosts]
      const uniquePosts = Array.from(new Set(allPosts.map((post) => post?.id)))
        .map((id) => allPosts.find((post) => post?.id === id))
        .filter(Boolean)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)

      return uniquePosts
    } catch (fallbackError) {
      console.error("Both GraphQL and fallback fetches failed:", fallbackError)
      return []
    }
  }
})
