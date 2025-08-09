import type { Metadata } from "next"
import { siteConfig } from "@/config/site"
import { HomeContent } from "@/components/HomeContent"
import { getLatestPosts } from "@/lib/api/wordpress"

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

export const revalidate = 600 // Revalidate every 10 minutes

async function getHomePageData(limit = 20) {
  try {
    const { posts } = await getLatestPosts(limit)
    return posts ?? []
  } catch (error) {
    console.error("Failed to fetch posts for homepage:", error)
    return []
  }
}

export default async function Home() {
  const posts = await getHomePageData()
  return <HomeContent initialPosts={posts} />
}
