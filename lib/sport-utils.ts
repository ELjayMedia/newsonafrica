import { cache } from "react"
import { fetchPosts } from "./wordpress-api"
import type { WordPressPost } from "./wordpress-api"

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

async function fetchCategoryPosts(slug: string, count: number) {
  return fetchPosts({ perPage: count, category: slug })
}

export const fetchSportPosts = cache(async (count = 5) => {
  try {
    // Try to fetch posts from the "sport" category
    let posts = (await fetchCategoryPosts("sport", count)) as WordPressPost[]

    // If no posts found, try the "sports" category (plural)
    if (!posts || posts.length === 0) {
      posts = (await fetchCategoryPosts("sports", count)) as WordPressPost[]
    }

    return posts || []
  } catch (error) {
    console.error("Error fetching sport posts:", error)
    return []
  }
})
