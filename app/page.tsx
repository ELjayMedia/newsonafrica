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

  alternates: {
    canonical: siteConfig.url,
    languages: {
      "en-US": siteConfig.url,
      en: siteConfig.url,
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

  other: {
    "og:site_name": "News On Africa",
    "og:locale": "en_US",
  },
}

export const dynamic = "force-dynamic"
export const revalidate = 300

async function getHomePageData(countryCode: string): Promise<HomePageData> {
  const fallbackPost = {
    id: "fallback-1",
    slug: "welcome",
    title: "Welcome to News On Africa",
    excerpt: "Your trusted source for pan-African news and stories. We're loading the latest content for you.",
    date: new Date().toISOString(),
    country: countryCode,
    featuredImage: {
      node: {
        sourceUrl: "/placeholder.svg?height=400&width=600",
        altText: "News On Africa",
      },
    },
  }

  const fallbackData: HomePageData = {
    taggedPosts: [fallbackPost],
    recentPosts: [fallbackPost],
    countryPosts: { [countryCode]: [fallbackPost] },
    featuredPosts: [fallbackPost],
  }

  try {
    console.log("[v0] Fetching homepage data for country:", countryCode)

    // Use Promise.allSettled to handle partial failures gracefully
    const [taggedResult, latestResult] = await Promise.allSettled([
      getFpTaggedPostsForCountry(countryCode, 8),
      getLatestPostsForCountry(countryCode, 10),
    ])

    const taggedPosts = taggedResult.status === "fulfilled" ? taggedResult.value : []
    const latestPosts = latestResult.status === "fulfilled" ? (latestResult.value.posts ?? []) : []

    console.log("[v0] Tagged posts:", taggedPosts.length, "Latest posts:", latestPosts.length)

    const recentPosts = mapPostsToHomePosts(latestPosts, countryCode)

    // If we have no posts at all, return fallback data
    if (taggedPosts.length === 0 && recentPosts.length === 0) {
      console.log("[v0] No posts available, using fallback data")
      return fallbackData
    }

    const featuredPosts = taggedPosts.length > 0 ? taggedPosts.slice(0, 6) : recentPosts.slice(0, 6)

    console.log("[v0] Successfully fetched homepage data")
    return {
      taggedPosts,
      recentPosts,
      countryPosts: { [countryCode]: recentPosts },
      featuredPosts,
    }
  } catch (error) {
    console.error("[v0] Homepage data fetch failed:", error)
    // Always return fallback data instead of throwing
    return fallbackData
  }
}

export default async function Home() {
  let countryCode = "sz" // Default fallback

  try {
    countryCode = getServerCountry()
    console.log("[v0] Server country:", countryCode)
  } catch (error) {
    console.error("[v0] Failed to get server country:", error)
  }

  try {
    const initialData = await getHomePageData(countryCode)
    console.log("[v0] Rendering homepage with", initialData.featuredPosts.length, "featured posts")

    return (
      <HomeContent
        initialPosts={initialData.recentPosts}
        countryPosts={initialData.countryPosts}
        featuredPosts={initialData.featuredPosts}
        initialData={{
          taggedPosts: initialData.taggedPosts,
          featuredPosts: initialData.featuredPosts,
          categories: [],
          recentPosts: initialData.recentPosts,
        }}
      />
    )
  } catch (error) {
    console.error("[v0] Homepage render failed:", error)
    // Return a minimal working component even if everything fails
    const fallbackPost = {
      id: "error-fallback",
      slug: "error",
      title: "News On Africa",
      excerpt: "We're experiencing technical difficulties. Please refresh the page.",
      date: new Date().toISOString(),
      country: countryCode,
      featuredImage: {
        node: {
          sourceUrl: "/placeholder.svg?height=400&width=600",
          altText: "News On Africa",
        },
      },
    }

    return (
      <HomeContent
        initialPosts={[fallbackPost]}
        featuredPosts={[fallbackPost]}
        countryPosts={{ [countryCode]: [fallbackPost] }}
      />
    )
  }
}
