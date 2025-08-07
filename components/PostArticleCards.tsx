import Link from "next/link"
import Image from "next/image"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Article {
  id: number | string
  title: string
  href: string
  thumbnailUrl?: string | null
  timestamp: string
  tag?: string | null
}

interface PostArticleCardsProps {
  articles: Article[]
  className?: string
}

/**
 * Grid of teaser cards displayed below the main story.
 */
export function PostArticleCards({ articles, className = "" }: PostArticleCardsProps) {
  return (
    <div
      className={cn(
        "mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8",
        className,
      )}
    >
      {articles.map((article) => (
        <Link
          key={article.id}
          href={article.href}
          aria-label={article.title}
          className="group flex flex-col sm:flex-row md:flex-col items-start gap-3 p-2 rounded transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md"
        >
          {article.thumbnailUrl ? (
            <Image
              src={article.thumbnailUrl}
              alt={article.title}
              width={100}
              height={100}
              className="w-20 h-20 md:w-[100px] md:h-[100px] rounded object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-20 h-20 md:w-[100px] md:h-[100px] rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0"
              aria-hidden="true"
            />
          )}

          <div className="flex flex-col flex-1">
            {article.tag === "LIVE" ? (
              <span className="mb-1 w-fit rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                LIVE
              </span>
            ) : (
              <span className="mb-1 flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" /> {article.timestamp}
              </span>
            )}
            <h3 className="font-bold text-sm md:text-base line-clamp-2">{article.title}</h3>
          </div>
        </Link>
      ))}
    </div>
  )
}

