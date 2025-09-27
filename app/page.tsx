import type { Metadata } from "next"
import { siteConfig } from "@/config/site"
import { HomeContent } from "@/components/HomeContent"
import { getLatestPostsForCountry, getFpTaggedPostsForCountry, mapPostsToHomePosts } from "@/lib/wordpress-api"
import type { HomePageData } from "@/types/home"
import { getServerCountry } from "@/lib/utils/routing"

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: "African News, News On Africa, Latest News, Breaking News, African Politics, Business News",

  // Canonical URL and robots for homepage
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "en-US": siteConfig.url,
      en: siteConfig.url,
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
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/og-image.jpg`,
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
    images: [`${siteConfig.url}/og-image.jpg`],
  },

  // Additional SEO metadata
  other: {
    "og:site_name": "News On Africa",
    "og:locale": "en_US",
  },
}

export const revalidate = 60 // Revalidate every 60 seconds

async function getHomePageData(countryCode: string): Promise<HomePageData> {
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const cacheKey = `homepage-data-${countryCode}`
  const cached = enhancedCache.get(cacheKey)

  // If we have fresh data, use it
  if (cached.exists && !cached.isStale) {
    return cached.data
  }

  try {
    const result = await circuitBreaker.execute(
      "wordpress-homepage-api",
      async () => {
        const [taggedPosts, latestPosts] = await Promise.all([
          getFpTaggedPostsForCountry(countryCode, 8),
          getLatestPostsForCountry(countryCode, 10),
        ])

        const recentPosts = mapPostsToHomePosts(latestPosts.posts ?? [], countryCode)

        if (taggedPosts.length === 0 && recentPosts.length === 0) {
          throw new Error("No posts available from WordPress API")
        }

        const featuredPosts = taggedPosts.length > 0 ? taggedPosts.slice(0, 6) : recentPosts.slice(0, 6)

        return {
          taggedPosts,
          recentPosts,
          countryPosts: { [countryCode]: recentPosts },
          featuredPosts,
        }
      },
      async () => {
        if (cached.exists) {
          console.log("[v0] Using stale cached data as fallback")
          return cached.data
        }

        throw new Error("No cached data available and API is unavailable")
      },
    )

    enhancedCache.set(cacheKey, result, 300000, 900000) // 5min fresh, 15min stale
    return result
  } catch (error) {
    console.error("[v0] Homepage data fetch failed:", error)

    if (cached.exists) {
      console.log("[v0] Using stale cached data due to API failure")
      return cached.data
    }

    throw new Error("Unable to load homepage data: API unavailable and no cached data")
  }
}

export default async function Home() {
  const countryCode = getServerCountry()
  try {
    const initialData = await getHomePageData(countryCode)
    return (
      <HomeContent
        initialPosts={initialData.recentPosts}
        countryPosts={initialData.countryPosts}
        featuredPosts={initialData.featuredPosts}
        initialData={initialData}
      />
    )
  } catch (error: any) {
    console.error("Homepage data fetch failed:", error?.message || error, error?.stack)
    return (
      <HomeContent
        initialPosts={[]}
        emptyState={{
          title: "Unable to Load Content",
          description:
            "We're experiencing connectivity issues with our content service. Please try refreshing the page or check back in a few minutes.",
          showRetry: true,
        }}
      />
    )
  }
}
