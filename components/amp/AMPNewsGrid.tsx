import Link from "next/link"

interface NewsGridProps {
  posts: Array<{
    id: string
    title: string
    excerpt: string
    slug: string
    date: string
    type?: string
    featuredImage?: {
      node: {
        sourceUrl: string
      }
    }
  }>
  layout?: "vertical" | "horizontal" | "mixed"
  className?: string
}

export function AMPNewsGrid({ posts, layout = "mixed", className = "" }: NewsGridProps) {
  if (!posts?.length) return null

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}>
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.slug}`}
          className="flex gap-3 items-start bg-white p-2 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 group"
        >
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <h3 className="font-semibold text-sm group-hover:text-blue-600 mb-2">{post.title}</h3>
            <div className="flex items-center text-gray-500 text-xs mt-2">
              <amp-timeago width="160" height="20" datetime={post.date} layout="responsive">
                {new Date(post.date).toISOString()}
              </amp-timeago>
            </div>
          </div>
          {post.featuredImage && (
            <div className="relative w-24 h-24 flex-shrink-0">
              <amp-img
                src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={post.title}
                layout="responsive"
                width="1"
                height="1"
                className="rounded-md"
              />
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
