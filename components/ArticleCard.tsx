"use client"

import { type MouseEvent, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bookmark, BookmarkCheck, Heart, Share2, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from "@/lib/utils"

interface ArticleCardProps {
  href: string
  headline: string
  excerpt?: string
  categoryTag?: string
  timestamp?: string | Date
  imageUrl?: string | null
  imageAlt?: string
  imageBlurDataURL?: string
  imagePriority?: boolean
  imageSizes?: string
  layout?: "vertical" | "horizontal"
  className?: string
  articleClassName?: string
  contentClassName?: string
  mediaClassName?: string
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

type TimestampParts = {
  display?: string
  iso?: string
}

function getTimestampParts(timestamp?: string | Date): TimestampParts {
  if (!timestamp) return {}

  const value = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  if (Number.isNaN(value.getTime())) {
    return {}
  }

  return {
    display: formatDate(value),
    iso: value.toISOString(),
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
  categoryTag,
  timestamp,
  imageUrl,
  imageAlt,
  imageBlurDataURL,
  imagePriority,
  imageSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  layout = "vertical",
  className,
  articleClassName,
  contentClassName,
  mediaClassName,
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
  const isHorizontal = layout === "horizontal"
  const hasActions = Boolean(onShare || onSave || onLike)
  const { display: displayTimestamp, iso } = getTimestampParts(timestamp)
  const resolvedImage = imageUrl || FALLBACK_IMAGE

  return (
    <Link href={href} className={cn("group block h-full", className)}>
      <article
        className={cn(
          "flex h-full overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          isHorizontal ? "flex-col sm:flex-row" : "flex-col",
          articleClassName
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            isHorizontal
              ? "w-full aspect-[4/3] sm:aspect-[4/3] sm:w-48 sm:flex-shrink-0"
              : "w-full aspect-[16/9]",
            mediaClassName
          )}
        >
          {resolvedImage ? (
            <Image
              src={resolvedImage}
              alt={imageAlt || headline}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes={imageSizes}
              priority={imagePriority}
              placeholder={imageBlurDataURL ? "blur" : undefined}
              blurDataURL={imageBlurDataURL}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col gap-3 p-4",
            isHorizontal ? "sm:p-5" : "",
            contentClassName
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              {categoryTag ? (
                <Badge
                  className={cn(
                    "w-fit text-[10px] uppercase tracking-wide",
                    categoryClassName
                  )}
                >
                  {categoryTag}
                </Badge>
              ) : null}

              <h3
                className={cn(
                  "text-base font-semibold leading-tight text-foreground transition-colors duration-200 group-hover:text-primary",
                  isHorizontal ? "sm:text-lg" : "text-lg",
                  headlineClassName
                )}
              >
                {headline}
              </h3>

              {showExcerpt && excerpt ? (
                <p
                  className={cn(
                    "text-sm text-muted-foreground/90 line-clamp-3",
                    isHorizontal ? "sm:line-clamp-3" : "line-clamp-4",
                    excerptClassName
                  )}
                >
                  {excerpt}
                </p>
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
                    aria-label={isSaved ? "Remove bookmark" : "Save article"}
                    aria-pressed={Boolean(isSaved)}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Bookmark className="h-4 w-4" aria-hidden="true" />
                    )}
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
                    aria-label={isLiked ? "Unlike article" : "Like article"}
                    aria-pressed={Boolean(isLiked)}
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
