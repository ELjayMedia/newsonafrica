import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck, Copy, Mail, Share2, Link as LinkIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface ArticleHeaderProps {
  title: string
  excerpt?: string
  category?: string
  author?: string
  publishedDate?: string | Date
  readingTime?: number
  wordCount?: number
  showTimeAgo?: boolean
  onShare?: () => void
  onBookmark?: () => void
  isBookmarked?: boolean
  className?: string
}

export function ArticleHeader({
  title,
  excerpt,
  category,
  author,
  publishedDate,
  readingTime,
  wordCount,
  showTimeAgo = true,
  onShare,
  onBookmark,
  isBookmarked = false,
  className,
}: ArticleHeaderProps) {
  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return ""
    return showTimeAgo ? formatDistanceToNow(d, { addSuffix: true }) : d.toLocaleDateString()
  }

  return (
    <div className={cn("space-y-6 border-b border-border pb-6", className)}>
      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {publishedDate && <time>{formatDate(publishedDate)}</time>}
        {readingTime && <span className="flex items-center gap-1">~ {readingTime} min read</span>}
        {wordCount && <span>{wordCount.toLocaleString()} words</span>}
      </div>

      {/* Category */}
      {category && <Badge variant="outline">{category}</Badge>}

      {/* Title */}
      <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">{title}</h1>

      {/* Excerpt */}
      {excerpt && <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">{excerpt}</p>}

      {/* Author and Actions */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        {author && <p className="text-sm font-medium text-foreground">By {author}</p>}

        {/* Share and Bookmark Buttons */}
        <div className="flex items-center gap-2">
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}

          {onBookmark && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBookmark}
              className={cn("gap-2", isBookmarked && "bg-primary/10")}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
