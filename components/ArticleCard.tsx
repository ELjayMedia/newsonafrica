"use client"

import { type MouseEvent, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bookmark, BookmarkCheck, Clock, Heart, Share2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from "@/lib/utils"

export type ArticleCardLayout = "vertical" | "horizontal"
export type ArticleCardVariant = "default" | "featured" | "compact"

interface ArticleCardImageProps {
  src?: string | null
  alt?: string
  blurDataURL?: string
  sizes?: string
  priority?: boolean
}

export interface ArticleCardProps {
  href: string
  headline: string
  excerpt?: string
  category?: string
  timestamp?: string | Date
  image?: ArticleCardImageProps
  layout?: ArticleCardLayout
  variant?: ArticleCardVariant
  className?: string
  articleClassName?: string
  mediaClassName?: string
  contentClassName?: string
  headlineClassName?: string
  excerptClassName?: string
  categoryClassName?: string
  metadata?: ReactNode
  showExcerpt?: boolean
  onShare?: () => void
  onSave?: () => void
  onLike?: () => void
  isSaved?: boolean
  isLiked?: boolean
}

const FALLBACK_IMAGE = "/placeholder.svg?height=360&width=640&text=News+Article"

const VARIANT_STYLES: Record<ArticleCardVariant, { headline: string; excerpt: string; content: string; category: string }> = {
  featured: {
    headline: "text-lg font-semibold leading-tight md:text-xl",
    excerpt: "text-sm text-muted-foreground/90 md:text-base",
    content: "gap-4 p-4 md:p-5",
    category: "text-[11px]",
  },
  default: {
    headline: "text-base font-semibold leading-snug md:text-lg",
    excerpt: "text-sm text-muted-foreground/90",
    content: "gap-3 p-4",
    category: "text-[10px]",
  },
  compact: {
    headline: "text-sm font-semibold leading-snug md:text-base",
    excerpt: "text-xs text-muted-foreground/80",
    content: "gap-2.5 p-3 md:p-4",
    category: "text-[10px]",
  },
}

function getTimestampParts(timestamp?: string | Date) {
  if (!timestamp) return { display: undefined as string | undefined, iso: undefined as string | undefined }

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  if (Number.isNaN(date.getTime())) {
    return { display: undefined, iso: undefined }
  }

  return {
    display: formatDate(date),
    iso: date.toISOString(),
  }
}

function createActionHandler(action?: () => void) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    action?.()
  }
}

export function ArticleCard({
  href,
  headline,
  excerpt,
  category,
  timestamp,
  image,
  layout = "vertical",
  variant = "default",
  className,
  articleClassName,
  mediaClassName,
  contentClassName,
  headlineClassName,
  excerptClassName,
  categoryClassName,
  metadata,
  showExcerpt = true,
  onShare,
  onSave,
  onLike,
  isSaved,
  isLiked,
}: ArticleCardProps) {
  const { display: displayTimestamp, iso } = getTimestampParts(timestamp)
  const { headline: headlineStyles, excerpt: excerptStyles, content: contentStyles, category: categoryStyles } =
    VARIANT_STYLES[variant]

  const isHorizontal = layout === "horizontal"
  const hasActions = Boolean(onShare || onSave || onLike)
  const imageSrc = image?.src ?? FALLBACK_IMAGE

  return (
    <Link href={href} className={cn("group block h-full", className)}>
      <article
        className={cn(
          "flex h-full overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          isHorizontal ? "flex-col sm:flex-row" : "flex-col",
          articleClassName
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            isHorizontal ? "w-full aspect-video sm:aspect-[4/3] sm:w-40 sm:flex-shrink-0" : "w-full aspect-video",
            mediaClassName
          )}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={image?.alt || headline}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes={image?.sizes}
              priority={image?.priority}
              placeholder={image?.blurDataURL ? "blur" : undefined}
              blurDataURL={image?.blurDataURL}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col",
            contentStyles,
            contentClassName
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              {category ? (
                <Badge className={cn("w-fit uppercase tracking-wide", categoryStyles, categoryClassName)}>{category}</Badge>
              ) : null}

              <h3
                className={cn(
                  "text-foreground transition-colors duration-200 group-hover:text-primary",
                  headlineStyles,
                  headlineClassName
                )}
              >
                {headline}
              </h3>

              {showExcerpt && excerpt ? (
                <p className={cn("line-clamp-3", excerptStyles, excerptClassName)}>{excerpt}</p>
              ) : null}
            </div>

            {hasActions ? (
              <div className="ml-auto flex flex-shrink-0 items-center gap-1 self-start">
                {onShare ? (
                  <button
                    type="button"
                    onClick={createActionHandler(onShare)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Share article"
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}

                {onSave ? (
                  <button
                    type="button"
                    onClick={createActionHandler(onSave)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      isSaved && "text-primary"
                    )}
                    aria-pressed={Boolean(isSaved)}
                    aria-label={isSaved ? "Remove bookmark" : "Save article"}
                  >
                    {isSaved ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
                  </button>
                ) : null}

                {onLike ? (
                  <button
                    type="button"
                    onClick={createActionHandler(onLike)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      isLiked && "text-destructive"
                    )}
                    aria-pressed={Boolean(isLiked)}
                    aria-label={isLiked ? "Unlike article" : "Like article"}
                  >
                    <Heart className={cn("h-4 w-4", isLiked && "fill-current")} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {(metadata || displayTimestamp) && (
            <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
              {metadata ? <div className="flex items-center gap-1">{metadata}</div> : null}
              {metadata && displayTimestamp ? <span className="text-muted-foreground/60">•</span> : null}
              {displayTimestamp ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <time dateTime={iso}>{displayTimestamp}</time>
                </span>
              ) : null}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
