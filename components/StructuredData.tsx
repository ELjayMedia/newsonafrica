import type { Post } from "@/lib/types"
import { ENV } from "@/config/env"

interface StructuredDataProps {
  post: Post
  url: string
}

export function StructuredData({ post, url }: StructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    datePublished: post.date,
    dateModified: post.modified,
    author: {
      "@type": "Person",
      name: post.author.node.name,
    },
    publisher: {
      "@type": "Organization",
      name: "News On Africa",
        logo: {
          "@type": "ImageObject",
          url: `${ENV.NEXT_PUBLIC_SITE_URL}/logo.png`,
        },
    },
    description: post.excerpt,
      image: post.featuredImage?.node?.sourceUrl || `${ENV.NEXT_PUBLIC_SITE_URL}/default-og-image.jpg`,
    mainEntityOfPage: url,
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
}
