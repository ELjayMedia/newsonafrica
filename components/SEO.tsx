import { SchemaOrg } from "@/components/SchemaOrg"

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
  // Only render SchemaOrg since it doesn't use Head
  return (
    <>
      <SchemaOrg schemas={schemas} />
    </>
  )
}
