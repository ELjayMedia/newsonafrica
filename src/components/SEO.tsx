import { SchemaOrg } from "@/components/SchemaOrg"
import { SocialMetadata } from "@/components/SocialMetadata"
import { CanonicalUrl } from "@/components/CanonicalUrl"
import Head from "next/head"

interface SEOProps {
  title: string
  description: string
  image?: string
  url: string
  type?: string
  publishedTime?: string
  modifiedTime?: string
  authorName?: string
  keywords?: string[]
  section?: string
  schemas?: any[]
}

export function SEO({
  title,
  description,
  image = "/default-og-image.jpg",
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  authorName,
  keywords = [],
  section,
  schemas = [],
}: SEOProps) {
  const path = url.replace(/^https?:\/\/[^/]+/, "")

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      <CanonicalUrl path={path} />
      <SocialMetadata
        title={title}
        description={description}
        image={image}
        url={url}
        type={type}
        publishedTime={publishedTime}
        modifiedTime={modifiedTime}
        authorName={authorName}
        keywords={keywords}
        section={section}
      />
      <SchemaOrg schemas={schemas} />
    </>
  )
}
