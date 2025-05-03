import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"

interface Post {
  id: string
  title: string
  slug: string
  date: string
  featuredImage?: {
    node: {
      sourceUrl: string
    }
  }
}

interface RelatedPostsProps {
  posts: Post[]
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  return (
    <>
      {posts.map((post) => (
        <Link key={post.id} href={`/post/${post.slug}`} className="group">
          <article className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-lg">
            {post.featuredImage && (
              <div className="relative h-48">
                <Image
                  src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={post.title}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                {post.title}
              </h3>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </>
  )
}
