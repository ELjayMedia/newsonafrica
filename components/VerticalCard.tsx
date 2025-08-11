"use client"

import { UnifiedCard } from "./ui/unified-card"

interface VerticalCardProps {
  post: {
    title: string
    slug: string
    date: string
    type?: string
    featuredImage?: { sourceUrl: string } | { node: { sourceUrl: string } }
  }
  className?: string
}

export function VerticalCard(props: VerticalCardProps) {
  return (
    <UnifiedCard
      {...props}
      post={{ ...props.post, id: props.post.slug }}
      variant="vertical"
      showExcerpt={false}
      showAuthor={false}
    />
  )
}
