"use client"

import Image from "next/image"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazy-load"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getArticleUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import type { Article } from "@/types/article"
import type { WordPressPost } from "@/lib/wordpress-api"

type ArticleCardLayout = "compact" | "standard" | "featured"

interface ArticleCardProps {
  article: Article | WordPressPost
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

function inferArticleCountry(article: Article | WordPressPost) {
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

function extractImageUrl(article: Article | WordPressPost): string | null {
  const source = article as any

  // Try multiple possible image sources
  const imageSources = [
    source?.featuredImage?.node?.sourceUrl,
    source?.featured_image_url,
    source?.featuredImage?.sourceUrl,
    source?.featured_image?.url,
    source?._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
    source?._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes?.full?.source_url,
    source?._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes?.large?.source_url,
    source?._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes?.medium?.source_url,
  ]

  for (const imageUrl of imageSources) {
    if (typeof imageUrl === "string" && imageUrl.trim().length > 0) {
      // Validate it's a proper URL
      try {
        new URL(imageUrl)
        return imageUrl
      } catch {
        // If it's a relative path, it might still be valid
        if (imageUrl.startsWith("/")) {
          return imageUrl
        }
      }
    }
  }

  return null
}

function normalizeArticleData(article: Article | Post) {
  const country = inferArticleCountry(article)
  const featuredImage = extractImageUrl(article)

  if ("categories" in article && Array.isArray((article as any).categories?.nodes)) {
    const post = article as Post
    const categories =
      post.categories?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node))
        .map((node) => ({
          name: node.name ?? "",
          slug: node.slug ?? "",
        })) ?? []

    return {
      id: String(post.id ?? post.databaseId ?? post.slug ?? ""),
      title: post.title || "Untitled Article",
      excerpt: (post.excerpt || "").replace(/<[^>]*>/g, ""),
      slug: post.slug ?? "",
      date: post.date ?? "",
      featuredImage,
      author: post.author?.node?.name,
      categories,
      link: getArticleUrl(post.slug ?? "", country),
    }
  }

  const art = article as Article
  return {
    id: art.id,
    title: art.title || "Untitled Article",
    excerpt: art.excerpt || "",
    slug: art.slug,
    date: art.date,
    featuredImage,
    author: art.author?.node?.name,
    categories:
      art.categories?.edges?.map((edge) => ({
        name: edge.node.name,
        slug: edge.node.slug,
      })) || [],
    link: getArticleUrl(art.slug, country),
  }
}

export function ArticleCard({ article, layout = "standard", className, priority = false }: ArticleCardProps) {
  let data
  try {
    data = normalizeArticleData(article)
  } catch (error) {
    console.error("[v0] Error normalizing article data:", error, article)
    // Return a minimal error card
    return (
      <Card className={cn("group", className)}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Unable to display article</p>
        </CardContent>
      </Card>
    )
  }

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
                loading={priority ? "eager" : "lazy"}
                sizes="64px"
                quality={75}
                onError={(e) => {
                  console.error("[v0] Image load error:", imageUrl)
                  e.currentTarget.src = fallbackImage
                }}
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
            loading={priority ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 448px"
            quality={85}
            onError={(e) => {
              console.error("[v0] Image load error:", imageUrl)
              e.currentTarget.src = fallbackImage
            }}
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
          loading={priority ? "eager" : "lazy"}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 320px"
          quality={80}
          onError={(e) => {
            console.error("[v0] Image load error:", imageUrl)
            e.currentTarget.src = fallbackImage
          }}
        />
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
