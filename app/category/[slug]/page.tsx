import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategoriesForCountry, getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import { getServerCountry, getCategoryUrl } from "@/lib/utils/routing"
import CategoryClientPage from "./CategoryClientPage"
import * as log from "@/lib/log"
import { env } from "@/config/env"

interface CategoryPageProps {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Static generation configuration
export const revalidate = 300 // Revalidate every 5 minutes
export const dynamicParams = true // Allow dynamic params not in generateStaticParams

// Generate static paths for all categories
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")

  try {
    const categories = await circuitBreaker.execute(
      "wordpress-categories-static",
      async () => await getCategoriesForCountry(getServerCountry()),
      async () => {
        log.info("[v0] Categories static generation: Using fallback due to WordPress unavailability")
        return []
      },
    )

    return categories.slice(0, 50).map((category) => ({
      slug: category.slug,
    }))
  } catch (error) {
    log.error("Error generating static params for categories", { error })
    return []
  }
}

// Enhanced metadata generation for categories with canonical URLs and robots
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  log.info(`Generating metadata for category: ${params.slug}`)
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const country = getServerCountry()
  const cacheKey = `category-metadata-${country}-${params.slug}`
  const cached = enhancedCache.get(cacheKey)

  if (cached.exists && !cached.isStale) {
    log.info(`[v0] Category metadata: Using cached data for ${params.slug}`)
    return cached.data
  }

  try {
    const result = await circuitBreaker.execute(
      "wordpress-category-metadata",
      async () => {
        const { category, posts } = await getPostsByCategoryForCountry(country, params.slug, 10)

        if (!category) {
          log.info(`Category not found for metadata generation: ${params.slug}`)
          return {
            title: "Category Not Found - News On Africa",
            description: "The requested category could not be found.",
            robots: {
              index: false,
              follow: false,
              noarchive: true,
            },
            alternates: {
              canonical: `${env.NEXT_PUBLIC_SITE_URL}${getCategoryUrl(params.slug, country)}`,
            },
          }
        }

        log.info(`Generated metadata for category: "${category.name}"`)

        // Create dynamic description
        const baseDescription = category.description || `Latest articles in the ${category.name} category`
        const postCount = category.count || posts.length
        const description = `${baseDescription}. Browse ${postCount} articles covering ${category.name.toLowerCase()} news from across Africa.`

        // Get featured image from the first post with an image
        const featuredPost = posts.find((post) => post.featuredImage?.node?.sourceUrl)
        const featuredImageUrl = featuredPost?.featuredImage?.node?.sourceUrl || "/default-category-image.jpg"

        // Create canonical URL
        const canonicalUrl = `${env.NEXT_PUBLIC_SITE_URL}${getCategoryUrl(params.slug, country)}`

        // Generate keywords
        const keywords = [
          category.name,
          `${category.name} News`,
          "African News",
          "News On Africa",
          ...posts.slice(0, 5).map((post) => post.title.split(" ").slice(0, 3).join(" ")),
        ].join(", ")

        return {
          title: `${category.name} News - News On Africa`,
          description,
          keywords,
          category: category.name,

          // Canonical URL and robots directives
          alternates: {
            canonical: canonicalUrl,
            languages: {
              "en-US": canonicalUrl,
              en: canonicalUrl,
            },
          },

          // Enhanced robots directives
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

          // Open Graph metadata
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
            ],
          },

          // Twitter metadata
          twitter: {
            card: "summary_large_image",
            site: "@newsonafrica",
            title: `${category.name} - News On Africa`,
            description,
            images: [
              {
                url: featuredImageUrl,
                alt: `${category.name} news from News On Africa`,
              },
            ],
          },

          // Additional SEO metadata
          other: {
            "article:section": category.name,
            "article:tag": category.name,
            "og:updated_time": new Date().toISOString(),
            "og:site_name": "News On Africa",
            "og:locale": "en_US",
          },
        }
      },
      async () => {
        if (cached.exists) {
          log.info(`[v0] Category metadata: Using stale cache for ${params.slug}`)
          return cached.data
        }

        log.info(`[v0] Category metadata: Using fallback for ${params.slug}`)
        return {
          title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - News On Africa`,
          description: `Latest articles in the ${params.slug} category from News On Africa`,
          robots: {
            index: false,
            follow: true,
          },
          alternates: {
            canonical: `${env.NEXT_PUBLIC_SITE_URL}${getCategoryUrl(params.slug, country)}`,
          },
        }
      },
    )

    enhancedCache.set(cacheKey, result, 600000, 1800000) // 10min fresh, 30min stale
    return result
  } catch (error) {
    log.error(`Error generating metadata for category ${params.slug}`, { error })

    if (cached.exists) {
      return cached.data
    }

    return {
      title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - News On Africa`,
      description: `Latest articles in the ${params.slug} category from News On Africa`,
      robots: {
        index: false,
        follow: true,
      },
      alternates: {
        canonical: `${env.NEXT_PUBLIC_SITE_URL}${getCategoryUrl(params.slug, country)}`,
      },
    }
  }
}

// Server component that fetches data and renders the page
export default async function CategoryServerPage({ params }: CategoryPageProps) {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const country = getServerCountry()
  const cacheKey = `category-data-${country}-${params.slug}`
  const cached = enhancedCache.get(cacheKey)

  try {
    const categoryData = await circuitBreaker.execute(
      "wordpress-category-data",
      async () => {
        const data = await getPostsByCategoryForCountry(country, params.slug, 20)

        if (!data.category) {
          notFound()
        }

        return data
      },
      async () => {
        if (cached.exists) {
          log.info(`[v0] Category data: Using stale cache for ${params.slug}`)
          return cached.data
        }

        log.info(`[v0] Category data: Using fallback for ${params.slug}`)
        return {
          category: {
            name: params.slug.charAt(0).toUpperCase() + params.slug.slice(1),
            slug: params.slug,
            description: "Category temporarily unavailable",
            count: 0,
          },
          posts: [
            {
              id: "fallback-category",
              title: "Category Content Temporarily Unavailable",
              excerpt: "We're experiencing temporary issues loading this category. Please try again shortly.",
              slug: "category-unavailable",
              date: new Date().toISOString(),
              author: { node: { name: "News On Africa", slug: "news-team" } },
              categories: { nodes: [{ name: params.slug, slug: params.slug }] },
              featuredImage: { node: { sourceUrl: "/category-placeholder.png", altText: "Category unavailable" } },
            },
          ],
        }
      },
    )

    if (categoryData && !cached.isStale) {
      enhancedCache.set(cacheKey, categoryData, 300000, 900000) // 5min fresh, 15min stale
    }

    return <CategoryClientPage params={params} initialData={categoryData} />
  } catch (error) {
    log.error(`Error loading category page for ${params.slug}`, { error })

    if (cached.exists) {
      log.info(`[v0] Category page: Using cached data due to error for ${params.slug}`)
      return <CategoryClientPage params={params} initialData={cached.data} />
    }

    return notFound()
  }
}
