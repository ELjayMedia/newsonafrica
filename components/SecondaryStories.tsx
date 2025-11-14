import { ArticleCard } from "@/components/ArticleCard"
import { cn } from "@/lib/utils"
import { generateBlurDataURL } from "@/lib/utils/lazy-load"
import { getArticleUrl } from "@/lib/utils/routing"

interface SecondaryStoryPost {
  id: string
  title: string
  slug: string
  date: string
  country?: string
  featuredImage?: {
    node?: {
      sourceUrl?: string
    }
  }
}

export interface SecondaryStoriesProps {
  posts: SecondaryStoryPost[]
  layout?: "horizontal" | "vertical"
}

export function SecondaryStories({ posts, layout = "vertical" }: SecondaryStoriesProps) {
  if (!posts?.length) return null

  const items = posts.slice(0, 3)
  const isHorizontal = layout === "horizontal"

  return (
    <div
      className={cn(
        "grid md:gap-1.5",
        isHorizontal ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {items.map((post) => (
        <ArticleCard
          key={post.id}
          href={getArticleUrl(post.slug, post.country)}
          headline={post.title}
          timestamp={post.date}
          imageUrl={post.featuredImage?.node?.sourceUrl}
          imageAlt={post.title}
          imageBlurDataURL={generateBlurDataURL(400, 225)}
          layout={isHorizontal ? "horizontal" : "vertical"}
          showExcerpt={false}
          className="h-full"
          articleClassName={cn(
            "rounded-xl bg-gray-50 transition-colors hover:bg-gray-100 dark:bg-slate-900/70 dark:hover:bg-slate-900",
            isHorizontal ? "md:flex-row" : ""
          )}
          contentClassName={cn("p-2 md:p-3", isHorizontal && "md:p-4")}
          mediaClassName={
            isHorizontal
              ? "h-24 w-24 flex-shrink-0 md:h-auto md:w-full md:aspect-video"
              : "aspect-video"
          }
          headlineClassName="text-xs font-semibold md:text-sm"
        />
      ))}
    </div>
  )
}
