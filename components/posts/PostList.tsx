"use client"

import type { PostListItemData } from "@/lib/data/post-list"
import { cn } from "@/lib/utils"
import { PostListItem, type PostListItemVariant } from "./PostListItem"

interface PostListProps {
  posts: PostListItemData[]
  className?: string
  showImages?: boolean
  variant?: PostListItemVariant
  emptyMessage?: string
}

export function PostList({ posts, className, showImages = true, variant = "default", emptyMessage }: PostListProps) {
  if (!posts || posts.length === 0) {
    return emptyMessage ? (
      <div className={cn("rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    ) : null
  }

  return (
    <ul className={cn("grid gap-4", className)}>
      {posts.map((post) => (
        <PostListItem key={post.id} post={post} showImage={showImages} variant={variant} />
      ))}
    </ul>
  )
}
