import type { Metadata } from "next"
import { siteConfig } from "@/config/site"
import { HomeContent } from "@/components/HomeContent"
import { getLatestPostsForCountry } from "@/lib/api/wordpress"

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: "African News, News On Africa, Latest News, Breaking News, African Politics, Business News",

  // Canonical URL and robots for homepage
  alternates: {
    canonical: "https://newsonafrica.com",
    languages: {
      "en-US": "https://newsonafrica.com",
      en: "https://newsonafrica.com",
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

  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: "https://newsonafrica.com",
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://newsonafrica.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@newsonafrica",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["https://newsonafrica.com/og-image.jpg"],
  },

  // Additional SEO metadata
  other: {
    "og:site_name": "News On Africa",
    "og:locale": "en_US",
  },
}

export const revalidate = 60 // Revalidate every 60 seconds

async function getHomePageData() {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const cacheKey = "homepage-data"
  const cached = enhancedCache.get(cacheKey)

  // If we have fresh data, use it
  if (cached.exists && !cached.isStale) {
    console.log("[v0] Homepage: Using fresh cached data")
    return cached.data
  }

  try {
    const result = await circuitBreaker.execute(
      "wordpress-homepage-api",
      async () => {
        const countries = ["sz", "za"]
        const countryPromises = countries.map(async (countryCode) => {
          try {
            const { posts } = await getLatestPostsForCountry(countryCode, 4)
            return { countryCode, posts: posts || [] }
          } catch (error) {
            console.error(`[v0] Failed to fetch posts for ${countryCode}:`, error)
            return { countryCode, posts: [] }
          }
        })

        const countryResults = await Promise.allSettled(countryPromises)
        const allPosts: any[] = []
        const countryPosts: Record<string, any[]> = {}

        countryResults.forEach((result) => {
          if (result.status === "fulfilled") {
            const { countryCode, posts } = result.value
            countryPosts[countryCode] = posts
            allPosts.push(...posts)
          }
        })

        if (allPosts.length === 0) {
          throw new Error("No posts available from any country")
        }

        allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return {
          posts: allPosts.slice(0, 20),
          countryPosts,
          featuredPosts: allPosts.slice(0, 6),
        }
      },
      async () => {
        if (cached.exists) {
          console.log("[v0] Homepage: Using stale cached data due to API failure")
          return cached.data
        }

        console.log("[v0] Homepage: Using fallback content - no cache available")
        const fallbackPosts = [
          {
            id: "fallback-1",
            title: "News On Africa - Service Notice",
            excerpt: "We're experiencing temporary connectivity issues. Our team is working to restore full service.",
            slug: "service-notice",
            date: new Date().toISOString(),
            author: { node: { name: "News On Africa", slug: "news-team" } },
            categories: { nodes: [{ name: "Notice", slug: "notice" }] },
            featuredImage: { node: { sourceUrl: "/news-placeholder.png", altText: "Service notice" } },
          },
        ]

        return {
          posts: fallbackPosts,
          countryPosts: { sz: fallbackPosts },
          featuredPosts: fallbackPosts,
        }
      },
    )

    enhancedCache.set(cacheKey, result, 300000, 900000) // 5min fresh, 15min stale
    return result
  } catch (error) {
    console.error("[v0] Homepage data fetch failed:", error)

    if (cached.exists) {
      console.log("[v0] Homepage: Returning stale cache due to complete failure")
      return cached.data
    }

    return {
      posts: [
        {
          id: "error-fallback",
          title: "Service Temporarily Unavailable",
          excerpt: "We're working to restore full service. Thank you for your patience.",
          slug: "service-unavailable",
          date: new Date().toISOString(),
          author: { node: { name: "News On Africa", slug: "news-team" } },
          categories: { nodes: [{ name: "System", slug: "system" }] },
          featuredImage: { node: { sourceUrl: "/news-placeholder.png", altText: "Service notice" } },
        },
      ],
      countryPosts: {},
      featuredPosts: [],
    }
  }
}

export default async function Home() {
  try {
    const { posts, countryPosts, featuredPosts } = await getHomePageData()
    return <HomeContent initialPosts={posts} countryPosts={countryPosts} featuredPosts={featuredPosts} />
  } catch (error) {
    console.error("Homepage data fetch failed:", error)
    return <HomeContent initialPosts={[]} />
  }
}
