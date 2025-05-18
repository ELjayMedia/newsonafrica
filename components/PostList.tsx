import Link from "next/link"
import Image from "next/image"

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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <article key={post.id} className="h-full">
          <Link href={`/post/${post.slug}`} className="group h-full flex flex-col" aria-label={post.title}>
            <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-200 ease-in-out group-hover:shadow-lg flex-1 flex flex-col">
              <div className="relative h-48">
                <Image
                  src={post.featuredImage?.node?.sourceUrl || "/placeholder.svg?height=400&width=600&query=news"}
                  alt={post.title || "Post image"}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  priority={false}
                  loading="lazy"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">{post.title}</h2>
                <div className="text-gray-600 flex-1" dangerouslySetInnerHTML={{ __html: post.excerpt }} />
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  )
}
