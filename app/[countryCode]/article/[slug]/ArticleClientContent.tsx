import type { WordPressPost } from "@/lib/wordpress/client"

import { ArticleClientShell } from "./ArticleClientShell"

interface ArticleClientContentProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
  relatedPosts: WordPressPost[]
}

export function ArticleClientContent({
  slug,
  countryCode,
  sourceCountryCode,
  initialData,
  relatedPosts,
}: ArticleClientContentProps) {
  return (
    <ArticleClientShell
      slug={slug}
      countryCode={countryCode}
      sourceCountryCode={sourceCountryCode}
      initialData={initialData}
      relatedPosts={relatedPosts}
    />
  )
}
