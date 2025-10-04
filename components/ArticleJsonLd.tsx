import { JsonLd } from "@/components/JsonLd"
import { getNewsArticleSchema } from "@/lib/schema"
import type { Post } from "@/lib/types"
import { env } from "@/config/env"

interface ArticleJsonLdProps {
  post: Post
  url: string
}

export function ArticleJsonLd({ post, url }: ArticleJsonLdProps) {
  const authorSlug = post.author.node.slug
  const imageUrl =
    post.featuredImage?.node?.sourceUrl ?? `${env.NEXT_PUBLIC_SITE_URL}/default-og-image.jpg`
  const schema = getNewsArticleSchema({
    url,
    title: post.title,
    description: post.excerpt,
    images: [imageUrl],
    datePublished: post.date,
    dateModified: post.modified,
    authorName: post.author.node.name,
    authorUrl: authorSlug ? `${env.NEXT_PUBLIC_SITE_URL}/author/${authorSlug}` : undefined,
  })

  return <JsonLd data={schema} />
}
