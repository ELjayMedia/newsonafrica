import Fuse from "fuse.js"

// Define the post interface
export interface Post {
  id: string
  title: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  content?: {
    rendered: string
  }
  slug: string
  date: string
  [key: string]: any // Allow for additional properties
}

/**
 * Search posts using Fuse.js
 * @param posts Array of posts to search through
 * @param query Search query string
 * @returns Array of matched posts
 */
export function searchPosts(posts: Post[], query: string): Post[] {
  // Return empty array for empty inputs
  if (!query || query.trim().length === 0 || !posts || posts.length === 0) {
    return []
  }

  // Configure Fuse.js options
  const options = {
    includeScore: true,
    threshold: 0.3,
    keys: ["title.rendered", "excerpt.rendered", "content.rendered"],
  }

  // Create Fuse instance
  const fuse = new Fuse(posts, options)

  // Perform search
  const results = fuse.search(query)

  // Return only the matched items
  return results.map((result) => result.item)
}
