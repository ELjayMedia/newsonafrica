import Image from "next/image"
import Link from "next/link"

interface FeaturedStoryProps {
  post: {
    title: string
    excerpt: string
    slug: string
    featuredImage: {
      node: {
        sourceUrl: string
      }
    }
  }
}

export function FeaturedStory({ post }: FeaturedStoryProps) {
  return (
    <Link href={`/post/${post.slug}`} className="block group">
      <div className="grid md:grid-cols-2 gap-4 items-center">
        <div className="relative h-48 md:h-72">
          <Image
            src={post.featuredImage?.node?.sourceUrl || "/placeholder.jpg"}
            alt={post.title}
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
            priority
          />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold mb-2 group-hover:text-blue-600">{post.title}</h1>
          <div className="text-gray-600 text-base line-clamp-3" dangerouslySetInnerHTML={{ __html: post.excerpt }} />
        </div>
      </div>
    </Link>
  )
}
