import { OptimizedImage } from "@/components/OptimizedImage"
import { PostList } from "@/components/posts/PostList"
import type { WordPressAuthor } from "@/types/wp"
import type { PostListItemData } from "@/lib/mapping/post-mappers"

interface AuthorContentProps {
  author: WordPressAuthor
  posts: PostListItemData[]
}

export default function AuthorContent({ author, posts }: AuthorContentProps) {

  if (!author) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Author Not Found</h1>
          <p>The requested author could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Author Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Author Avatar */}
          <div className="flex-shrink-0">
            {author.avatar?.url ? (
              <OptimizedImage
                src={author.avatar.url}
                alt={`${author.name} - Author at News On Africa`}
                width={120}
                height={120}
                className="rounded-full"
              />
            ) : (
              <div className="w-30 h-30 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-500">{author.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Author Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{author.name}</h1>
            {author.description && <p className="text-gray-600 mb-4 leading-relaxed">{author.description}</p>}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{posts.length} articles published</span>
            </div>
          </div>
        </div>
      </div>

      {/* Author's Articles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Articles by {author.name}</h2>

        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No articles found for this author.</p>
          </div>
        )}
      </div>
    </div>
  )
}
