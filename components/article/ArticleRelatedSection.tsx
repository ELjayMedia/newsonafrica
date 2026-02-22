import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { ArticleCard } from "@/components/ArticleCard"
import type { WordPressPost } from "@/types/wp"
import { cn } from "@/lib/utils"

interface ArticleRelatedSectionProps {
  articles: WordPressPost[]
  countryCode?: string
  title?: string
  className?: string
}

export function ArticleRelatedSection({
  articles,
  countryCode = "sz",
  title = "Related Stories",
  className,
}: ArticleRelatedSectionProps) {
  if (!articles || articles.length === 0) {
    return null
  }

  return (
    <section className={cn("space-y-6 border-t border-border pt-8", className)}>
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            href={`/${countryCode}/article/${article.slug}`}
            headline={article.title ?? "Untitled"}
            excerpt={article.excerpt ?? ""}
            category={article.categories?.nodes?.[0]?.name}
            timestamp={article.date ?? ""}
            image={{
              src: article.featuredImage?.node?.sourceUrl,
              alt: article.title ?? "Related article image",
            }}
            variant="compact"
          />
        ))}
      </div>
    </section>
  )
}
