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
    <section className={cn("space-y-4 border-t-2 border-[#e2001a] pt-5", className)}>
      <p className="text-xs font-bold uppercase tracking-widest text-[#e2001a]">RELATED ARTICLES</p>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            href={`/${countryCode}/article/${article.slug}`}
            headline={article.title ?? "Untitled"}
            showExcerpt={false}
            category={article.categories?.nodes?.[0]?.name}
            timestamp={article.date ?? ""}
            image={{
              src: article.featuredImage?.node?.sourceUrl,
              alt: article.title ?? "Related article image",
            }}
            variant="compact"
            articleClassName="rounded-lg border-border/70 shadow-none"
            mediaClassName="aspect-video"
            categoryClassName="bg-transparent px-0 text-xs font-bold uppercase tracking-wider text-[#e2001a]"
            headlineClassName="line-clamp-2 text-sm font-bold leading-snug"
            contentClassName="gap-1 p-3"
          />
        ))}
      </div>
    </section>
  )
}
