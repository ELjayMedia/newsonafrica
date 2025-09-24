import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategoriesForCountry, getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import CategoryClientPage from "../../../category/[slug]/CategoryClientPage"
import { SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import * as log from "@/lib/log"
import { siteConfig } from "@/config/site"

interface Params {
  countryCode: string
  slug: string
}

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
    const params: Params[] = []
    for (const country of SUPPORTED_COUNTRIES) {
      try {
        const categories = await circuitBreaker.execute(
          `wordpress-categories-static-${country}`,
          async () => await getCategoriesForCountry(country),
          async () => [],
        )
        params.push(
          ...categories.slice(0, 50).map((category) => ({
            countryCode: country,
            slug: category.slug,
          })),
        )
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
  const cached = enhancedCache.get(cacheKey)

  if (cached.exists && !cached.isStale) {
    return cached.data
  }

  try {
    const result = await circuitBreaker.execute(
      "wordpress-category-metadata",
      async () => await getPostsByCategoryForCountry(countryCode, slug, 10),
      async () => ({ category: null, posts: [] }),
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
          canonical: `${siteConfig.url}/${countryCode}/category/${slug}`,
        },
      }
    }

    const baseDescription = category.description || `Latest articles in the ${category.name} category`
    const postCount = category.count || posts.length
    const description = `${baseDescription}. Browse ${postCount} articles covering ${category.name.toLowerCase()} news from across Africa.`

    const featuredPost = posts.find((post) => post.featuredImage?.node?.sourceUrl)
    const featuredImageUrl =
      featuredPost?.featuredImage?.node?.sourceUrl || "/default-category-image.jpg"

    const canonicalUrl = `${siteConfig.url}/${countryCode}/category/${slug}`

    const keywords = [
      category.name,
      `${category.name} News`,
      "African News",
      "News On Africa",
      ...posts.slice(0, 5).map((post) => post.title.split(" ").slice(0, 3).join(" ")),
    ].join(", ")

    const metadata: Metadata = {
      title: `${category.name} News - News On Africa`,
      description,
      keywords,
      category: category.name,
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
        bingBot: {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
        },
      },
      openGraph: {
        type: "website",
        title: `${category.name} - News On Africa`,
        description,
        url: canonicalUrl,
        siteName: "News On Africa",
        locale: "en_US",
        images: [
          {
            url: featuredImageUrl,
            width: 1200,
            height: 630,
            alt: `${category.name} news from News On Africa`,
            type: "image/jpeg",
          },
          {
            url: featuredImageUrl,
            width: 800,
            height: 600,
            alt: `${category.name} news from News On Africa`,
            type: "image/jpeg",
          },
          {
            url: featuredImageUrl,
            width: 400,
            height: 300,
            alt: `${category.name} news from News On Africa`,
            type: "image/jpeg",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${category.name} - News On Africa`,
        description,
        images: [featuredImageUrl],
      },
      other: {
        "article:section": category.name,
        "article:tag": category.name,
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
        canonical: `${siteConfig.url}/${countryCode}/category/${slug}`,
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
    const data = await getPostsByCategoryForCountry(countryCode, slug, 20)
    if (!data.category) {
      return notFound()
    }
    return <CategoryClientPage params={{ slug }} initialData={data} />
  } catch (error) {
    log.error(`Error fetching category ${slug} for ${countryCode}`, { error })
    return notFound()
  }
}
