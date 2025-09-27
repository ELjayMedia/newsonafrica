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

// This component is now deprecated in favor of metadata API
// Social metadata should be set in generateMetadata functions
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
  // Component kept for backward compatibility but renders nothing
  // Social metadata is now handled via the metadata API in page components
  return null
}
