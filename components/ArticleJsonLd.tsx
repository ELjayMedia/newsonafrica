import { JsonLd } from "@/components/JsonLd"
import { getNewsArticleSchema } from "@/lib/schema"
import type { Post } from "@/lib/wordpress-api"
import { env } from "@/config/env"

interface ArticleJsonLdProps {
  post: Post
  url: string
}

export function ArticleJsonLd({ post, url }: ArticleJsonLdProps) {
  const schema = getNewsArticleSchema({
    url: url,
    title: post.title,
    description: post.excerpt,
    images: [post.featuredImage?.node?.sourceUrl || "/default-og-image.jpg"],
    datePublished: post.date,
    dateModified: post.modified,
    authorName: post.author.node.name,
      authorUrl: `${env.NEXT_PUBLIC_SITE_URL}/author/${post.author.node.slug}`,
  })

  return <JsonLd data={schema} />
}
