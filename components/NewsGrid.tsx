"use client"

import { HorizontalCard } from "./HorizontalCard"
import { VerticalCard } from "./VerticalCard"
import { cn } from "@/lib/utils"

interface Post {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  type?: string
  featuredImage?: {
    node: {
      sourceUrl: string
    }
  }
  author?: {
    node: {
      name: string
    }
  }
}

interface NewsGridProps {
  posts: Post[]
  layout?: "vertical" | "horizontal" | "mixed"
  className?: string
}

export function NewsGrid({ posts, layout = "mixed", className = "" }: NewsGridProps) {
  if (!posts?.length) {
    return <div className={cn("py-8 text-center", className)}>No posts found</div>
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", className)}>
      {posts.map((post, index) => {
        const orientation = layout === "mixed" ? (index === 0 ? "vertical" : "horizontal") : layout
        return orientation === "vertical" ? (
          <VerticalCard key={post.id} post={post} />
        ) : (
          <HorizontalCard key={post.id} post={post} />
        )
      })}
    </div>
  )

}
