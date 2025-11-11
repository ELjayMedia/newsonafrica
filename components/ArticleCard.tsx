"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns/formatDistanceToNow"
import { cn, formatDate, motionSafe } from "@/lib/utils"
import { generateBlurDataURL } from "@/lib/utils/lazy-load"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getArticleUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import type { Article } from "@/types/article"
import type { WordPressPost } from "@/types/wp"
import { sanitizeExcerpt } from "@/lib/utils/text/sanitizeExcerpt"

type ArticleCardLayout =
  | "compact"
  | "standard"
  | "featured"
  | "horizontal"
  | "minimal"
  | "vertical"

interface ArticleCardProps {
  article: Article | WordPressPost
  layout?: ArticleCardLayout
  className?: string
  priority?: boolean
  showExcerpt?: boolean
  eyebrow?: string
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

function normalizeArticleData(article: Article | WordPressPost) {
  const country = inferArticleCountry(article)
  const featuredImage = extractImageUrl(article)

  if ("categories" in article && Array.isArray((article as any).categories?.nodes)) {
    const post = article as WordPressPost
    const categories =
      post.categories?.nodes
        ?.filter((node): node is NonNullable<typeof node> => Boolean(node))
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

export function ArticleCard({
  article,
  layout = "standard",
  className,
  priority = false,
  showExcerpt,
  eyebrow,
}: ArticleCardProps) {
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
  const hasImage = Boolean(data.featuredImage)

  const dateValue = data.date ? new Date(data.date) : undefined
  const hasValidDate = dateValue && !Number.isNaN(dateValue.getTime())
  const relativeDate = hasValidDate
    ? formatDistanceToNow(dateValue as Date, {
        addSuffix: true,
      })
    : undefined
  const shortDate = hasValidDate
    ? (dateValue as Date).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
      })
    : undefined
  const sanitizedExcerpt = data.excerpt ? sanitizeExcerpt(data.excerpt) : ""
  const resolvedShowExcerpt = showExcerpt ?? layout === "horizontal"

  if (layout === "minimal") {
    return (
      <Link href={data.link} className={cn("block", className)}>
        <article className="py-2 border-b border-gray-100 last:border-b-0">
          <div className="flex gap-2">
            <div className="w-16 h-12 flex-shrink-0 relative rounded overflow-hidden">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={data.title}
                fill
                className="object-cover"
                sizes="64px"
                loading={priority ? "eager" : "lazy"}
                quality={75}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium line-clamp-2 leading-tight mb-1">{data.title}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{relativeDate ?? formatDate(data.date)}</span>
                {primaryCategory && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{primaryCategory.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  if (layout === "horizontal") {
    return (
      <Link href={data.link} className={cn("block", className)}>
        <article className="flex flex-col sm:flex-row h-full overflow-hidden rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="sm:w-1/3 h-40 sm:h-auto relative">
            {hasImage ? (
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={data.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
                loading={priority ? "eager" : "lazy"}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-300 text-sm">No image</span>
              </div>
            )}
          </div>
          <div className="sm:w-2/3 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900">{data.title}</h3>
              {resolvedShowExcerpt && sanitizedExcerpt ? (
                <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{sanitizedExcerpt}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-300">{relativeDate ?? formatDate(data.date)}</span>
              {data.author && (
                <span className="text-sm text-gray-500 dark:text-gray-300">by {data.author}</span>
              )}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  if (layout === "vertical") {
    return (
      <Link href={data.link} className={cn("group block h-full", className)}>
        <article
          className={cn(
            "flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200",
            motionSafe.transition,
          )}
        >
          {hasImage && (
            <div className="relative h-32 overflow-hidden">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={data.title}
                fill
                className={cn(
                  "transition-transform duration-300 group-hover:scale-105 object-cover",
                  motionSafe.transform,
                )}
                sizes="(max-width: 640px) 100vw, 240px"
                placeholder="blur"
                blurDataURL={generateBlurDataURL(300, 200)}
                loading={priority ? "eager" : "lazy"}
              />
            </div>
          )}
          <div className="p-3 flex-1 flex flex-col">
            {eyebrow && <div className="text-sm font-bold text-red-600 mb-1">{eyebrow}</div>}
            <h3
              className={cn(
                "font-bold text-sm leading-tight group-hover:text-blue-600 transition-colors duration-200",
                motionSafe.transition,
              )}
            >
              {data.title}
            </h3>
            {resolvedShowExcerpt && sanitizedExcerpt && (
              <p className="text-xs text-gray-600 line-clamp-2 mt-1">{sanitizedExcerpt}</p>
            )}
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-auto pt-2">
              <Clock className="h-3 w-3" />
              <time>{shortDate ?? formatDate(data.date)}</time>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  if (layout === "compact") {
    return (
      <Card className={cn("group hover:shadow-md transition-shadow", motionSafe.transition, className)}>
        <CardContent className="p-3">
          <div className="flex gap-3 items-center">
            <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={data.title}
                fill
                className={cn(
                  "object-cover group-hover:scale-105 transition-transform duration-200",
                  motionSafe.transform,
                )}
                placeholder="blur"
                blurDataURL={generateBlurDataURL(80, 80)}
                priority={priority}
                loading={priority ? "eager" : "lazy"}
                sizes="80px"
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
                <h3
                  className={cn(
                    "font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors",
                    motionSafe.transition,
                  )}
                >
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
      <Card
        className={cn("group hover:shadow-lg transition-all duration-300 max-w-md", motionSafe.transition, className)}
      >
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={data.title}
            fill
            className={cn("object-cover group-hover:scale-105 transition-transform duration-300", motionSafe.transform)}
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
            <h2
              className={cn(
                "text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors",
                motionSafe.transition,
              )}
            >
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
    <Card className={cn("group hover:shadow-md transition-shadow max-w-xs", motionSafe.transition, className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={data.title}
          fill
          className={cn("object-cover group-hover:scale-105 transition-transform duration-200", motionSafe.transform)}
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
          <h3
            className={cn(
              "font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors text-sm",
              motionSafe.transition,
            )}
          >
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
