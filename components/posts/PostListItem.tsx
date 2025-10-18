"use client"

import Image from "next/image"
import Link from "next/link"
import { Calendar, User } from "lucide-react"
import { format } from "date-fns"
import type { PostListItemData } from "@/lib/data/post-list"
import { cn } from "@/lib/utils"

export type PostListItemVariant = "default" | "compact"

interface PostListItemProps {
  post: PostListItemData
  variant?: PostListItemVariant
  showImage?: boolean
}

const formatPublishedDate = (value?: string) => {
  if (!value) return null
  try {
    return format(new Date(value), "PPP")
  } catch {
    return null
  }
}

export function PostListItem({ post, variant = "default", showImage = true }: PostListItemProps) {
  const publishedOn = formatPublishedDate(post.publishedAt)
  const showThumbnail = showImage && Boolean(post.image?.url)

  return (
    <li
      className={cn(
        "group relative flex gap-4 rounded-xl border border-border bg-background/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        variant === "compact" && "gap-3 p-3",
      )}
    >
      {showThumbnail && (
        <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg">
          <Image
            src={post.image?.url ?? "/placeholder.jpg"}
            alt={post.image?.alt ?? post.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(min-width: 768px) 192px, 128px"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            {post.categories.slice(0, 2).map((category) => (
              <Link
                key={category.slug}
                href={category.href}
                className="rounded-full bg-muted px-2 py-0.5 text-xs transition hover:bg-muted/80"
              >
                {category.name}
              </Link>
            ))}
          </div>

          <Link href={post.href} className="block text-lg font-semibold leading-tight tracking-tight transition hover:text-primary">
            {post.title}
          </Link>

          {post.excerpt && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {post.author?.name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" aria-hidden />
              {post.author.name}
            </span>
          )}
          {publishedOn && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              <time dateTime={post.publishedAt}>{publishedOn}</time>
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
