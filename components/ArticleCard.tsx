"use client"

import Image from "next/image"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazyLoad"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Article } from "@/types/article"
import type { Post } from "@/types/wordpress"

type ArticleCardLayout = "compact" | "standard" | "featured"

interface ArticleCardProps {
  article: Article | Post
  layout?: ArticleCardLayout
  className?: string
  priority?: boolean
}

function normalizeArticleData(article: Article | Post) {
  // Check if it's a WordPress Post or Article
  const isWordPressPost = "title" in article && typeof article.title === "object"

  if (isWordPressPost) {
    const post = article as Post
    return {
      id: post.id.toString(),
      title: post.title.rendered,
      excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ""), // Strip HTML
      slug: post.slug,
      date: post.date,
      featuredImage: post.featured_image_url,
      author: post.author_data?.name,
      categories: post.category_data?.map((cat) => ({ name: cat.name, slug: cat.slug })) || [],
      link: `/posts/${post.slug}`,
    }
  } else {
    const art = article as Article
    return {
      id: art.id,
      title: art.title,
      excerpt: art.excerpt || "",
      slug: art.slug,
      date: art.date,
      featuredImage: art.featuredImage?.node?.sourceUrl,
      author: art.author?.node?.name,
      categories:
        art.categories?.edges?.map((edge) => ({
          name: edge.node.name,
          slug: edge.node.slug,
        })) || [],
      link: `/articles/${art.slug}`,
    }
  }
}

export function ArticleCard({ article, layout = "standard", className, priority = false }: ArticleCardProps) {
  const data = normalizeArticleData(article)
  const primaryCategory = data.categories[0]

  const fallbackImage = "/placeholder.svg?height=400&width=600&text=News+Article"
  const imageUrl = data.featuredImage || fallbackImage

  if (layout === "compact") {
    return (
      <Card className={cn("group hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-3">
          <div className="flex gap-3">
            <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={data.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                placeholder="blur"
                blurDataURL={generateBlurDataURL(64, 64)}
                priority={priority}
              />
            </div>
            <div className="flex-1 min-w-0">
              {primaryCategory && (
                <Badge variant="secondary" className="mb-1 text-xs">
                  {primaryCategory.name}
                </Badge>
              )}
              <Link href={data.link} className="block">
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {data.title}
                </h3>
              </Link>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(data.date)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (layout === "featured") {
    return (
      <Card className={cn("group hover:shadow-lg transition-all duration-300 max-w-md", className)}>
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={data.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            placeholder="blur"
            blurDataURL={generateBlurDataURL(600, 400)}
            priority={priority}
          />
          {primaryCategory && (
            <Badge className="absolute top-3 left-3 bg-primary/90 hover:bg-primary text-xs">
              {primaryCategory.name}
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <Link href={data.link} className="block">
            <h2 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {data.title}
            </h2>
          </Link>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(data.date)}</span>
            {data.author && <span>By {data.author}</span>}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Standard layout
  return (
    <Card className={cn("group hover:shadow-md transition-shadow max-w-xs", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={data.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-200"
          placeholder="blur"
          blurDataURL={generateBlurDataURL(400, 300)}
          priority={priority}
        />
        {primaryCategory && (
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            {primaryCategory.name}
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <Link href={data.link} className="block">
          <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors text-sm">
            {data.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(data.date)}</span>
          {data.author && <span>By {data.author}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
