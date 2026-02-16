"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import type { WordPressPost } from "@/types/wp"
import { cn } from "@/lib/utils"

interface ArticleMostReadProps {
  articles: WordPressPost[]
  countryCode?: string
  className?: string
}

export function ArticleMostRead({ articles, countryCode = "sz", className }: ArticleMostReadProps) {
  if (!articles || articles.length === 0) {
    return null
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="border-b border-border bg-muted/50 px-6 py-4">
        <h2 className="text-lg font-bold text-foreground">Most Read</h2>
      </div>

      <div className="divide-y divide-border">
        {articles.map((article, index) => (
          <Link
            key={article.id}
            href={`/${countryCode}/article/${article.slug}`}
            className="block p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="line-clamp-2 font-semibold leading-snug text-foreground hover:text-primary">
                  {article.title}
                </h3>

                {article.date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(article.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
