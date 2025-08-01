import Head from "next/head"
import { siteConfig } from "@/config/site"

interface SocialMetadataProps {
  title: string
  description: string
  image: string
  url: string
  type?: string
  publishedTime?: string
  modifiedTime?: string
  authorName?: string
  keywords?: string[]
  section?: string
}

export function SocialMetadata({
  title,
  description,
  image,
  url,
  type = "article",
  publishedTime,
  modifiedTime,
  authorName,
  keywords = [],
  section = "News",
}: SocialMetadataProps) {
  const twitterHandle = siteConfig.links.twitter
    ? `@${siteConfig.links.twitter.split("twitter.com/")[1]}`
    : "@newsonafrica"
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Keywords */}
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(", ")} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:locale" content="en_US" />

      {/* Article specific Open Graph */}
      {type === "article" && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {authorName && <meta property="article:author" content={authorName} />}
          <meta property="article:publisher" content="https://www.facebook.com/newsonafrica" />
          <meta property="article:section" content={section} />
          {keywords.map((keyword, index) => (
            <meta key={index} property="article:tag" content={keyword} />
          ))}
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content={twitterHandle} />

      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    </Head>
  )
}
