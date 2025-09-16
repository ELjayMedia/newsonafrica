import { rewriteLegacyLinks } from "@/lib/utils/routing"

interface StyledPostContentProps {
  content: string
  className?: string
  countryCode?: string
}

export function StyledPostContent({ content, className = "", countryCode }: StyledPostContentProps) {
  if (!content) {
    return null
  }

  return (
    <div
      className={`prose prose-lg max-w-none mb-8 dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: rewriteLegacyLinks(content, countryCode) }}
    />
  )
}
