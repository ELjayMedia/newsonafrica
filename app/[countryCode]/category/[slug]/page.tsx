import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategoriesForCountry, getPostsByCategoryForCountry } from "@/lib/wp-server/categories"
import { SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import * as log from "@/lib/log"
import { env } from "@/config/env"
import { getCategoryPageData } from "@/lib/data/category"
import { siteConfig } from "@/config/site"
import { CategoryHeader } from "@/components/category/CategoryHeader"
import { PostList } from "@/components/posts/PostList"
import { EmptyState } from "@/components/category/EmptyState"
import { ErrorState } from "@/components/category/ErrorState"
import { LoadMoreClient } from "@/components/category/LoadMoreClient"
import type { WordPressCategory } from "@/types/wp"

interface Params {
  countryCode: string
  slug: string
}

export const runtime = "nodejs"
export const revalidate = 300
export const dynamicParams = true

type CategoriesResult = Awaited<ReturnType<typeof getCategoriesForCountry>>
type CategoryPostsResult = Awaited<ReturnType<typeof getPostsByCategoryForCountry>>

const categoriesMemo = new Map<string, Promise<CategoriesResult>>()
const categoryPostsMemo = new Map<string, Promise<CategoryPostsResult>>()

const getRenderedText = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value
  }

  if (
    value &&
    typeof value === "object" &&
    "rendered" in value &&
    typeof (value as { rendered?: unknown }).rendered === "string"
  ) {
    return (value as { rendered: string }).rendered
  }

  return null
}

function memoize<T>(map: Map<string, Promise<T>>, key: string, factory: () => Promise<T>) {
  if (!map.has(key)) {
    const promise = factory().catch((error) => {
      map.delete(key)
      throw error
    })
    map.set(key, promise)
  }

  return map.get(key)!
}

const getMemoizedCategories = (
  countryCode: string,
  factory: () => Promise<CategoriesResult>,
) => memoize(categoriesMemo, countryCode, factory)

const getMemoizedCategoryPosts = (
  countryCode: string,
  slug: string,
  limit: number,
  factory: () => Promise<CategoryPostsResult>,
) => memoize(categoryPostsMemo, `${countryCode}:${slug}:${limit}`, factory)

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
    const params: Params[] = []
    const prioritizedCategorySlugs = siteConfig.categories.map((category) => category.slug)
    for (const country of SUPPORTED_COUNTRIES) {
      try {
        const categories = await getMemoizedCategories(
          country,
          () =>
            circuitBreaker.execute(
              `wordpress-categories-static-${country}`,
              async () => await getCategoriesForCountry(country),
              async () => [],
              { country, endpoint: "rest:categories" },
            ),
        )

        const topCategories = prioritizedCategorySlugs
          .map((slug) => categories.find((category) => category.slug === slug))
          .filter(
            (category): category is WordPressCategory & { slug: string } =>
              typeof category?.slug === "string" && category.slug.length > 0,
          )

        for (const category of topCategories) {
          const slug = category.slug
          if (typeof slug === "string" && slug.length > 0) {
            params.push({
              countryCode: country,
              slug,
            })
          }
        }
      } catch (error) {
        log.error(`Error generating static params for ${country} categories`, { error })
      }
    }
    return params
  } catch (error) {
    log.error("generateStaticParams for country categories failed", { error })
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")
  const { countryCode, slug } = await params
  const cacheKey = `category-metadata-${countryCode}-${slug}`
  const cached = enhancedCache.get<Metadata>(cacheKey)

  if (cached.exists && !cached.isStale && cached.data != null) {
    return cached.data
  }

  try {
    const breakerKey = `wordpress-category-metadata-${countryCode}`
    const result = await getMemoizedCategoryPosts(
      countryCode,
      slug,
      10,
      () =>
        circuitBreaker.execute(
          breakerKey,
          async () => await getPostsByCategoryForCountry(countryCode, slug, 10),
          async () => ({
            category: null,
            posts: [],
            hasNextPage: false,
            endCursor: null,
          }),
          { country: countryCode, endpoint: "graphql:category-metadata" },
        ),
    )
    const { category, posts } = result
    if (!category) {
      return {
        title: "Category Not Found - News On Africa",
        description: "The requested category could not be found.",
        robots: {
          index: false,
          follow: false,
          noarchive: true,
        },
        alternates: {
          canonical: `${env.NEXT_PUBLIC_SITE_URL}/${countryCode}/category/${slug}`,
        },
      }
    }

    const categoryName = category.name ?? "Category"
    const baseDescription = category.description || `Latest articles in the ${categoryName} category`
    const postCount = category.count ?? posts.length
    const description = `${baseDescription}. Browse ${postCount} articles covering ${categoryName.toLowerCase()} news from across Africa.`

    const featuredPost = posts.find((post) => post.featuredImage?.node?.sourceUrl)
    const featuredImageUrl = featuredPost?.featuredImage?.node?.sourceUrl || "/default-category-image.jpg"

    const canonicalUrl = `${env.NEXT_PUBLIC_SITE_URL}/${countryCode}/category/${slug}`

    const topPostKeywords = posts
      .map((post) => getRenderedText(post.title))
      .filter((title): title is string => Boolean(title))
      .slice(0, 5)
      .map((title) => title.split(" ").slice(0, 3).join(" "))

    const keywords = [
      categoryName,
      `${categoryName} News`,
      "African News",
      "News On Africa",
      ...topPostKeywords,
    ].join(", ")

    const metadata: Metadata = {
      title: `${categoryName} News - News On Africa`,
      description,
      keywords,
      category: categoryName,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          "en-US": canonicalUrl,
          en: canonicalUrl,
        },
      },
      robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
          index: true,
          follow: true,
          noimageindex: false,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      openGraph: {
        type: "website",
        title: `${categoryName} - News On Africa`,
        description,
        url: canonicalUrl,
        siteName: "News On Africa",
        locale: "en_US",
        images: [
          {
            url: featuredImageUrl,
            width: 1200,
            height: 630,
            alt: `${categoryName} news from News On Africa`,
            type: "image/jpeg",
          },
          {
            url: featuredImageUrl,
            width: 800,
            height: 600,
            alt: `${categoryName} news from News On Africa`,
            type: "image/jpeg",
          },
          {
            url: featuredImageUrl,
            width: 400,
            height: 300,
            alt: `${categoryName} news from News On Africa`,
            type: "image/jpeg",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${categoryName} - News On Africa`,
        description,
        images: [featuredImageUrl],
      },
      other: {
        "article:section": categoryName,
        "article:tag": categoryName,
        bingbot: "index, follow, max-snippet:-1, max-image-preview:large",
      },
    }

    enhancedCache.set(cacheKey, metadata, 60 * 60)
    return metadata
  } catch (error) {
    log.error(`Error generating metadata for category ${slug}`, { error })
    return {
      title: `${slug} News - News On Africa`,
      description: `Latest articles in the ${slug} category from News On Africa`,
      alternates: {
        canonical: `${env.NEXT_PUBLIC_SITE_URL}/${countryCode}/category/${slug}`,
      },
    }
  }
}

interface CountryCategoryPageProps {
  params: Promise<Params>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CountryCategoryPage({ params }: CountryCategoryPageProps) {
  const { countryCode, slug } = await params

  try {
    const result = await getCategoryPageData(countryCode, slug, 20)

    if (result.kind === "not-found") {
      return notFound()
    }

    const hasPosts = result.posts.length > 0

    return (
      <div className="container mx-auto space-y-10 px-4 py-10">
        <CategoryHeader category={result.category} relatedCategories={result.relatedCategories} />

        {hasPosts ? (
          <div className="space-y-8">
            <PostList posts={result.posts} />
            {result.pageInfo.hasNextPage && (
              <LoadMoreClient
                countryCode={countryCode}
                slug={slug}
                initialCursor={result.pageInfo.endCursor}
                hasNextPage={result.pageInfo.hasNextPage}
              />
            )}
          </div>
        ) : (
          <EmptyState message={`We haven't published any articles for ${result.category.name} yet.`} />
        )}
      </div>
    )
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_NOT_FOUND") {
      throw error
    }
    log.error(`Error fetching category ${slug} for ${countryCode}`, { error })
    return (
      <div className="container mx-auto px-4 py-10">
        <ErrorState retryHref={`/${countryCode}/category/${slug}`} />
      </div>
    )
  }
}
