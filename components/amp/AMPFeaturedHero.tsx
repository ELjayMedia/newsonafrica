import Link from "next/link"

export function AMPFeaturedHero({ post }: { post: any }) {
  return (
    <Link href={`/post/${post.slug}`} className="block group">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {post.featuredImage && (
          <div className="w-full md:w-3/5 aspect-[16/9] relative">
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
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <amp-timeago width="160" height="20" datetime={post.date} layout="responsive">
              {new Date(post.date).toISOString()}
            </amp-timeago>
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-tight group-hover:text-blue-600">{post.title}</h1>
          <div
            className="text-gray-600 line-clamp-3 text-sm font-light"
            dangerouslySetInnerHTML={{ __html: post.excerpt || "" }}
          />
        </div>
      </div>
    </Link>
  )
}
