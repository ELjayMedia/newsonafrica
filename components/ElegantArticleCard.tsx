"use client"

import Image from "next/image"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getArticleUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { Clock, User } from "lucide-react"
import type { Article } from "@/types/article"
import type { Post } from "@/types/wordpress"

type ArticleCardLayout = "compact" | "standard" | "featured" | "hero"

interface ElegantArticleCardProps {
  article: Article | Post
  layout?: ArticleCardLayout
  className?: string
  priority?: boolean
}

function normalizeCountry(candidate?: string | null) {
  if (!candidate) return undefined
  const normalized = candidate.toLowerCase()
  return SUPPORTED_COUNTRIES.includes(normalized) ? normalized : undefined
}

function extractCountrySlug(value: unknown): string | undefined {
  if (!value) return undefined

  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const slug = extractCountrySlug(item)
      if (slug) return slug
    }
    return undefined
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>

    if (typeof record.slug === "string") {
      return record.slug
    }

    if (typeof record.code === "string") {
      return record.code
    }

    if (typeof record.value === "string") {
      return record.value
    }

    if (record.node) {
      const slug = extractCountrySlug(record.node)
      if (slug) return slug
    }

    if (record.country) {
      const slug = extractCountrySlug(record.country)
      if (slug) return slug
    }

    if (record.countries) {
      const slug = extractCountrySlug(record.countries)
      if (slug) return slug
    }

    if (Array.isArray(record.nodes)) {
      const slug = extractCountrySlug(record.nodes)
      if (slug) return slug
    }

    if (Array.isArray(record.edges)) {
      const slug = extractCountrySlug(record.edges)
      if (slug) return slug
    }
  }

  return undefined
}

function inferArticleCountry(article: Article | Post) {
  const source = article as any
  const potentialSources: unknown[] = [
    source?.country,
    source?.countryCode,
    source?.country_code,
    source?.edition?.country,
    source?.edition?.code,
    source?.edition?.slug,
    source?.countries,
    source?.countries?.nodes,
    source?.countries?.edges,
  ]

  for (const candidate of potentialSources) {
    const slug = extractCountrySlug(candidate)
    const normalized = normalizeCountry(slug)
    if (normalized) {
      return normalized
    }
  }

  return undefined
}

function normalizeArticleData(article: Article | Post) {
  const isWordPressPost = "title" in article && typeof article.title === "object"
  const country = inferArticleCountry(article)

  if (isWordPressPost) {
    const post = article as Post
    return {
      id: post.id.toString(),
      title: post.title.rendered,
      excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ""),
      slug: post.slug,
      date: post.date,
      featuredImage: post.featured_image_url || post.featuredImage?.node?.sourceUrl,
      author: post.author_data?.name,
      categories: post.category_data?.map((cat) => ({ name: cat.name, slug: cat.slug })) || [],
      link: getArticleUrl(post.slug, country),
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
      link: getArticleUrl(art.slug, country),
    }
  }
}

export function ElegantArticleCard({
  article,
  layout = "standard",
  className,
  priority = false,
}: ElegantArticleCardProps) {
  const data = normalizeArticleData(article)
  const primaryCategory = data.categories[0]
  const fallbackImage = "/placeholder.svg?height=400&width=600&text=News+Article"
  const imageUrl = data.featuredImage || fallbackImage

  if (layout === "hero") {
    return (
      <Card
        className={cn(
          "group hover:shadow-2xl transition-all duration-500 overflow-hidden border-stone-200 bg-gradient-to-br from-white to-stone-50",
          className,
        )}
      >
        <div className="relative aspect-[21/9] overflow-hidden">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={data.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            priority={priority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {primaryCategory && (
            <Badge className="absolute top-6 left-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 font-medium">
              {primaryCategory.name}
            </Badge>
          )}

          <div className="absolute bottom-6 left-6 right-6 text-white">
            <Link href={data.link} className="block">
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 line-clamp-3 group-hover:text-amber-200 transition-colors duration-300 text-balance leading-tight">
                {data.title}
              </h1>
            </Link>

            <div className="flex items-center gap-6 text-white/90 text-sm">
              {data.author && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{data.author}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDate(data.date)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (layout === "featured") {
    return (
      <Card
        className={cn(
          "group hover:shadow-xl transition-all duration-500 overflow-hidden border-stone-200 bg-white",
          className,
        )}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={data.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority={priority}
          />
          {primaryCategory && (
            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 font-medium">
              {primaryCategory.name}
            </Badge>
          )}
        </div>
        <CardContent className="p-6">
          <Link href={data.link} className="block">
            <h2 className="text-2xl font-serif font-bold mb-3 line-clamp-2 group-hover:text-amber-700 transition-colors duration-300 text-stone-900 leading-tight">
              {data.title}
            </h2>
          </Link>

          {data.excerpt && (
            <p className="text-stone-600 mb-4 line-clamp-2 leading-relaxed">{data.excerpt.substring(0, 150)}...</p>
          )}

          <div className="flex items-center justify-between text-sm text-stone-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDate(data.date)}</span>
              </div>
              {data.author && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{data.author}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (layout === "compact") {
    return (
      <Card className={cn("group hover:shadow-md transition-all duration-300 border-stone-200 bg-white", className)}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={data.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority={priority}
              />
            </div>
            <div className="flex-1 min-w-0">
              {primaryCategory && (
                <Badge
                  variant="secondary"
                  className="mb-2 text-xs bg-amber-50 text-amber-700 border-amber-200 font-medium"
                >
                  {primaryCategory.name}
                </Badge>
              )}
              <Link href={data.link} className="block">
                <h3 className="font-serif font-semibold text-base line-clamp-2 group-hover:text-amber-700 transition-colors duration-300 text-stone-900 leading-tight mb-2">
                  {data.title}
                </h3>
              </Link>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span>{formatDate(data.date)}</span>
                {data.author && <span>By {data.author}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Standard layout
  return (
    <Card className={cn("group hover:shadow-lg transition-all duration-400 border-stone-200 bg-white", className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={data.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-400"
          priority={priority}
        />
        {primaryCategory && (
          <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs font-medium">
            {primaryCategory.name}
          </Badge>
        )}
      </div>
      <CardContent className="p-5">
        <Link href={data.link} className="block">
          <h3 className="font-serif font-semibold mb-3 line-clamp-2 group-hover:text-amber-700 transition-colors duration-300 text-stone-900 text-lg leading-tight">
            {data.title}
          </h3>
        </Link>

        {data.excerpt && (
          <p className="text-stone-600 mb-4 line-clamp-2 text-sm leading-relaxed">
            {data.excerpt.substring(0, 100)}...
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-3">
            <span>{formatDate(data.date)}</span>
            {data.author && <span>By {data.author}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
