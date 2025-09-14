import logger from "@/utils/logger"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategoriesForCountry, getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import CategoryClientPage from "../../../category/[slug]/CategoryClientPage"
import { SUPPORTED_COUNTRIES } from "@/lib/utils/routing"

interface Params {
  countryCode: string
  slug: string
}

export const revalidate = 60
export const dynamicParams = true

export async function generateStaticParams() {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const params: { countryCode: string; slug: string }[] = []
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
      logger.error(`Error generating static params for ${country} categories:`, error)
    }
  }
  return params
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")
  const { countryCode, slug } = params
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
          canonical: `https://newsonafrica.com/${countryCode}/category/${slug}`,
        },
      }
    }

    const baseDescription = category.description || `Latest articles in the ${category.name} category`
    const postCount = category.count || posts.length
    const description = `${baseDescription}. Browse ${postCount} articles covering ${category.name.toLowerCase()} news from across Africa.`

    const featuredPost = posts.find((post) => post.featuredImage?.node?.sourceUrl)
    const featuredImageUrl =
      featuredPost?.featuredImage?.node?.sourceUrl || "/default-category-image.jpg"

    const canonicalUrl = `https://newsonafrica.com/${countryCode}/category/${slug}`

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
    logger.error(`❌ Error generating metadata for category ${slug}:`, error)
    return {
      title: `${slug} News - News On Africa`,
      description: `Latest articles in the ${slug} category from News On Africa`,
      alternates: {
        canonical: `https://newsonafrica.com/${countryCode}/category/${slug}`,
      },
    }
  }
}

export default async function CountryCategoryPage({ params }: { params: Params }) {
  const { countryCode, slug } = params
  const data = await getPostsByCategoryForCountry(countryCode, slug, 20)
  if (!data.category) {
    notFound()
  }
  return <CategoryClientPage params={{ slug }} initialData={data} />
}
