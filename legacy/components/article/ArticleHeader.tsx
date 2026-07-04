import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface ArticleHeaderProps {
  title: string
  excerpt?: string
  category?: string
  author?: string
  source?: string
  publishedDate?: string | Date
  readingTime?: number
  commentCount?: number
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
  source,
  publishedDate,
  readingTime,
  commentCount = 0,
  showTimeAgo = true,
  className,
}: ArticleHeaderProps) {
  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return ""
    return showTimeAgo ? formatDistanceToNow(d, { addSuffix: true }) : d.toLocaleDateString()
  }

  return (
    <div className={cn("space-y-4 border-b border-border pb-4", className)}>
      {category && (
        <span className="inline-block rounded-full bg-[#e2001a] px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
          {category}
        </span>
      )}

      {/* Title */}
      <h1 className="font-sans text-2xl font-bold leading-snug md:text-3xl">{title}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {author && <span>By {author}</span>}
          {source && (
            <>
              {author && <span>·</span>}
              <span>{source}</span>
            </>
          )}
          {publishedDate && (
            <>
              {(author || source) && <span>·</span>}
              <time>{formatDate(publishedDate)}</time>
            </>
          )}
          {readingTime && (
            <>
              <span>·</span>
              <span>{readingTime} min read</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-8 gap-1 rounded-md px-2 text-xs" aria-label="View comments">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{commentCount}</span>
          </Button>
        </div>
      </div>

      {/* Excerpt */}
      {excerpt && <p className="text-lg font-normal leading-relaxed text-muted-foreground md:text-xl">{excerpt}</p>}
    </div>
  )
}
