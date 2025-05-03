import Link from "next/link"

interface SecondaryStoriesProps {
  posts: Array<{
    id: string
    title: string
    slug: string
    date: string
    featuredImage?: {
      node: {
        sourceUrl: string
      }
    }
  }>
  layout?: "horizontal" | "vertical"
}

export function AMPSecondaryStories({ posts, layout = "vertical" }: SecondaryStoriesProps) {
  if (!posts?.length) return null

  return (
    <div
      className={`grid gap-6 ${layout === "horizontal" ? "grid-cols-1 md:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}
    >
      {posts.slice(0, 3).map((post, index) => (
        <Link
          key={post.id}
          href={`/post/${post.slug}`}
          className={`flex flex-row md:flex-col items-center md:items-start group bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200`}
        >
          {post.featuredImage && (
            <div
              className={`relative ${layout === "horizontal" ? "w-1/3 md:w-full h-24 md:h-auto md:aspect-video" : "w-full aspect-video"}`}
            >
              <amp-img
                src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={post.title}
                layout="responsive"
                width="16"
                height="9"
                className="rounded-md"
              />
            </div>
          )}
          <div className={`p-2 flex-1 flex flex-col ${layout === "horizontal" ? "ml-4 md:ml-0" : ""}`}>
            <h3 className="text-sm font-semibold group-hover:text-blue-600 mb-2">{post.title}</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-auto">
              <amp-timeago width="160" height="20" datetime={post.date} layout="responsive">
                {new Date(post.date).toISOString()}
              </amp-timeago>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
