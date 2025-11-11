import { ArticleCard } from "@/components/ArticleCard"
import type { WordPressCategory, WordPressPost } from "@/types/wp"

interface SecondaryStoryCategory {
  name?: string
  slug?: string
}

interface SecondaryStoryPost {
  id: string
  title: string
  slug: string
  date: string
  country?: string
  excerpt?: string
  categories?: SecondaryStoryCategory[]
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

  const articles = posts.slice(0, 3).map((post) => mapSecondaryPostToArticle(post))

  const variant = layout === "horizontal" ? "horizontal" : "compact"

  return (
    <div
      className={`grid md:gap-1.5 ${layout === "horizontal" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2 md:grid-cols-2 lg:grid-cols-3"}`}
    >
      {articles.map((article, index) => {
        return (
          <ArticleCard
            key={article.id ?? `${article.slug}-${index}`}
            article={article}
            layout={variant}
            priority={index < 2}
            showExcerpt={layout === "horizontal"}
            className="h-full"
          />
        )
      })}
    </div>
  )
}

function mapSecondaryPostToArticle(post: SecondaryStoryPost): WordPressPost & { country?: string } {
  const categoryNodes: WordPressCategory[] | undefined = post.categories?.map((category) => ({
    name: category.name,
    slug: category.slug,
  }))

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    featuredImage: post.featuredImage,
    categories: categoryNodes?.length ? { nodes: categoryNodes } : undefined,
    country: post.country,
  }
}
