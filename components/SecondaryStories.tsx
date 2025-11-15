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
          layout={isHorizontal ? "horizontal" : "vertical"}
          variant="compact"
          showExcerpt={false}
          className="h-full"
          articleClassName={cn(
            "rounded-xl bg-gray-50 transition-colors hover:bg-gray-100 dark:bg-slate-900/70 dark:hover:bg-slate-900",
            isHorizontal ? "md:flex-row" : ""
          )}
          contentClassName={cn("p-3", isHorizontal && "md:p-4")}
          mediaClassName={
            isHorizontal
              ? "h-24 w-24 flex-shrink-0 rounded-lg sm:h-28 sm:w-28 md:h-[84px] md:w-[84px]"
              : "aspect-video rounded-t-xl"
          }
          headlineClassName="text-xs font-semibold md:text-sm"
          image={{
            src: post.featuredImage?.node?.sourceUrl,
            alt: post.title,
            blurDataURL: generateBlurDataURL(400, 225),
            sizes: isHorizontal
              ? "(max-width: 640px) 96px, (max-width: 1024px) 33vw, 240px"
              : "(max-width: 640px) 50vw, 320px",
          }}
        />
      ))}
    </div>
  )
}
