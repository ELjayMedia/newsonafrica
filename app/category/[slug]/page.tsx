import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategories, getPostsByCategory } from "@/lib/api/wordpress"
import CategoryClientPage from "./CategoryClientPage"

interface CategoryPageProps {
  params: { slug: string }
}

// Static generation configuration
export const revalidate = 60 // Revalidate every 60 seconds
export const dynamicParams = true // Allow dynamic params not in generateStaticParams

// Generate static paths for all categories
export async function generateStaticParams() {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")

  try {
    const categories = await circuitBreaker.execute(
      "wordpress-categories-static",
      async () => await getCategories(),
      async () => {
        console.log("[v0] Categories static generation: Using fallback due to WordPress unavailability")
        return []
      },
    )

    // Return the first 50 most important categories for static generation
    // Others will be generated on-demand
    return categories.slice(0, 50).map((category) => ({
      slug: category.slug,
    }))
  } catch (error) {
    console.error("Error generating static params for categories:", error)
    // Return empty array to allow all pages to be generated on-demand
    return []
  }
}

// Enhanced metadata generation for categories with canonical URLs and robots
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  console.log(`🔍 Generating metadata for category: ${params.slug}`)
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const cacheKey = `category-metadata-${params.slug}`
  const cached = enhancedCache.get(cacheKey)

  if (cached.exists && !cached.isStale) {
    console.log(`[v0] Category metadata: Using cached data for ${params.slug}`)
    return cached.data
  }

  try {
    const result = await circuitBreaker.execute(
      "wordpress-category-metadata",
      async () => {
        const { category, posts } = await getPostsByCategory(params.slug, 10)

        if (!category) {
          console.warn(`⚠️ Category not found for metadata generation: ${params.slug}`)
          return {
            title: "Category Not Found - News On Africa",
            description: "The requested category could not be found.",
            robots: {
              index: false,
              follow: false,
              noarchive: true,
            },
            alternates: {
              canonical: `https://newsonafrica.com/category/${params.slug}`,
            },
          }
        }

        console.log(`✅ Generated metadata for category: "${category.name}"`)

        // Create dynamic description
        const baseDescription = category.description || `Latest articles in the ${category.name} category`
        const postCount = category.count || posts.length
        const description = `${baseDescription}. Browse ${postCount} articles covering ${category.name.toLowerCase()} news from across Africa.`

        // Get featured image from the first post with an image
        const featuredPost = posts.find((post) => post.featuredImage?.node?.sourceUrl)
        const featuredImageUrl = featuredPost?.featuredImage?.node?.sourceUrl || "/default-category-image.jpg"

        // Create canonical URL
        const canonicalUrl = `https://newsonafrica.com/category/${params.slug}`

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
          console.log(`[v0] Category metadata: Using stale cache for ${params.slug}`)
          return cached.data
        }

        console.log(`[v0] Category metadata: Using fallback for ${params.slug}`)
        return {
          title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - News On Africa`,
          description: `Latest articles in the ${params.slug} category from News On Africa`,
          robots: {
            index: false,
            follow: true,
          },
          alternates: {
            canonical: `https://newsonafrica.com/category/${params.slug}`,
          },
        }
      },
    )

    enhancedCache.set(cacheKey, result, 600000, 1800000) // 10min fresh, 30min stale
    return result
  } catch (error) {
    console.error(`❌ Error generating metadata for category ${params.slug}:`, error)

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
        canonical: `https://newsonafrica.com/category/${params.slug}`,
      },
    }
  }
}

// Server component that fetches data and renders the page
export default async function CategoryServerPage({ params }: CategoryPageProps) {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const cacheKey = `category-data-${params.slug}`
  const cached = enhancedCache.get(cacheKey)

  try {
    const categoryData = await circuitBreaker.execute(
      "wordpress-category-data",
      async () => {
        const data = await getPostsByCategory(params.slug, 20)

        if (!data.category) {
          notFound()
        }

        return data
      },
      async () => {
        if (cached.exists) {
          console.log(`[v0] Category data: Using stale cache for ${params.slug}`)
          return cached.data
        }

        console.log(`[v0] Category data: Using fallback for ${params.slug}`)
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
    console.error(`Error loading category page for ${params.slug}:`, error)

    if (cached.exists) {
      console.log(`[v0] Category page: Using cached data due to error for ${params.slug}`)
      return <CategoryClientPage params={params} initialData={cached.data} />
    }

    // For build-time errors, still try to render with empty data
    // The client component will handle the error state
    return <CategoryClientPage params={params} initialData={null} />
  }
}
