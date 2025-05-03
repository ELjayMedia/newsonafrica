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
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <Link key={post.id} href={`/post/${post.slug}`} className="group">
          <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-200 ease-in-out group-hover:scale-105">
            <div className="relative h-48">
              <Image
                src={post.featuredImage?.node?.sourceUrl || "/placeholder.jpg"}
                alt={post.title}
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600">{post.title}</h2>
              <div className="text-gray-600" dangerouslySetInnerHTML={{ __html: post.excerpt }} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
