import logger from "@/utils/logger";
"use client"

import { useState, useEffect } from "react"
import { fetchGraphQLClient } from "@/lib/graphql-client"
import { useAuth } from "@/hooks/useAuth"

const GET_POSTS = `
  query GetPosts($limit: Int, $offset: Int, $category: String) {
    posts(limit: $limit, offset: $offset, category: $category) {
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
        isBookmarked
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`

interface PostListProps {
  initialLimit?: number
  category?: string
}

export default function GraphQLPostList({ initialLimit = 10, category }: PostListProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const { token } = useAuth()

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const data = await fetchGraphQLClient(
        GET_POSTS,
        {
          limit: initialLimit,
          offset,
          category,
        },
        token,
      )

      setPosts((prev) => [...prev, ...data.posts.edges])
      setHasMore(data.posts.pageInfo.hasNextPage)
      setOffset((prev) => prev + initialLimit)
    } catch (err) {
      setError("Failed to load posts")
      logger.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleLoadMore = () => {
    fetchPosts()
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Latest Posts</h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div key={post.id} className="border rounded-lg overflow-hidden shadow-sm">
            {post.featuredImage && (
              <img
                src={post.featuredImage.sourceUrl || "/placeholder.svg"}
                alt={post.featuredImage.altText || post.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold">{post.title}</h3>
              <div className="text-sm text-gray-500 mt-1">
                By {post.author.name} • {new Date(post.date).toLocaleDateString()}
              </div>
              <div className="mt-2" dangerouslySetInnerHTML={{ __html: post.excerpt }} />
              <div className="mt-4 flex items-center justify-between">
                <a href={`/post/${post.slug}`} className="text-blue-600 hover:underline">
                  Read more
                </a>
                {post.isBookmarked ? (
                  <button className="text-yellow-500">Bookmarked</button>
                ) : (
                  <button className="text-gray-400 hover:text-yellow-500">Bookmark</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {hasMore && !loading && (
        <div className="text-center py-4">
          <button onClick={handleLoadMore} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
