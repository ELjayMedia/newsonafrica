import { JsonLd } from "@/components/JsonLd"
import { getNewsArticleSchema } from "@/lib/schema"
import type { Post } from "@/lib/types"
import type { WordPressPost } from "@/types/wp"

const SITE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || "http://app.newsonafrica.com"

type ArticleJsonLdPost = Post | WordPressPost

interface ArticleJsonLdProps {
  post: ArticleJsonLdPost
  url: string
}

export function ArticleJsonLd({ post, url }: ArticleJsonLdProps) {
  const authorNode =
    (post as Post).author?.node ?? (post as WordPressPost).author?.node ?? (post as WordPressPost).author ?? null
  const resolvedAuthorNode = authorNode as { slug?: string; name?: string } | null
  const authorSlug =
    resolvedAuthorNode && typeof resolvedAuthorNode.slug === "string" ? resolvedAuthorNode.slug : undefined
  const authorName =
    resolvedAuthorNode && typeof resolvedAuthorNode.name === "string" ? resolvedAuthorNode.name : undefined
  const imageUrl =
    post.featuredImage?.node?.sourceUrl ??
    (post as WordPressPost).featuredImage?.node?.sourceUrl ??
    `${SITE_URL}/default-og-image.jpg`
  const schema = getNewsArticleSchema({
    url,
    title: post.title ?? "",
    description: post.excerpt ?? "",
    images: [imageUrl],
    datePublished: post.date,
    dateModified: post.modified,
    authorName,
    authorUrl: authorSlug && authorSlug.length > 0 ? `${SITE_URL}/author/${authorSlug}` : undefined,
    speakableSelectors: ["article#article-content h1", "article#article-content .prose"],
  })

  return <JsonLd data={schema} />
}
