import Link from "next/link"

export function AMPPostContent({ post }: { post: any }) {
  const articleUrl = `https://newsonafrica.com/post/${post.slug}`

  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex flex-wrap items-center justify-between text-gray-600 text-sm">
          <div className="flex flex-wrap items-center space-x-2 mb-2 sm:mb-0">
            <amp-timeago width="160" height="20" datetime={post.date} layout="responsive">
              {new Date(post.date).toISOString()}
            </amp-timeago>
            <div className="flex items-center">
              <Link href={`/author/${post.author.node.slug}`} className="hover:underline">
                {post.author.node.name}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {post.featuredImage && (
        <div className="relative w-full h-48 md:h-[400px] mb-2">
          <amp-img
            src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
            alt={post.featuredImage.node.altText || post.title}
            layout="responsive"
            width="16"
            height="9"
            className="rounded-lg"
          />
        </div>
      )}

      <div className="prose prose-base max-w-none mb-8" dangerouslySetInnerHTML={{ __html: post.content || "" }} />

      <footer className="mt-8 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">
              By{" "}
              <Link href={`/author/${post.author.node.slug}`} className="font-semibold hover:underline">
                {post.author.node.name}
              </Link>
            </p>
            <p className="text-sm text-gray-500 mt-1">Last updated: {new Date(post.modified).toLocaleString()}</p>
          </div>
          <div className="flex space-x-2">
            {post.categories.nodes.map((category: any) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="text-blue-600 hover:underline text-sm"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </article>
  )
}
