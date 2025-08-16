import { HorizontalCard } from "./HorizontalCard"

interface Post {
  id: string
  title: string
  excerpt: string
  slug: string
  featuredImage: {
    node: {
      sourceUrl: string
    }
  }
}

interface PostListProps {
  posts: Post[]
}

export function PostList({ posts }: PostListProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No posts available at the moment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <HorizontalCard
          key={post.id}
          post={post}
          className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          allowHtml={true}
        />
      ))}
    </div>
  )
}
