import type { Metadata } from "next"
import { siteConfig } from "@/config/site"
import { HomeContent } from "@/components/HomeContent"
import { getLatestPosts, getCategories } from "@/lib/api/wordpress"

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

async function getHomePageData() {
  try {
    const results = await Promise.allSettled([
      getLatestPosts(50),
      getCategories(),
    ])

    const latestPostsResult =
      results[0].status === "fulfilled" ? results[0].value : { posts: [] }
    const categoriesResult =
      results[1].status === "fulfilled" ? results[1].value : { categories: [] }

    const posts = latestPostsResult.posts || []
    const categories = categoriesResult.categories || []

    const taggedPosts = posts.filter((post) =>
      post.tags?.nodes?.some(
        (tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp",
      ),
    )

    const initialData = {
      taggedPosts,
      featuredPosts: posts.slice(0, 6),
      categories,
      recentPosts: posts.slice(0, 10),
    }

    return { posts, initialData }
  } catch (error) {
    console.error("Failed to fetch posts for homepage:", error)
    return {
      posts: [],
      initialData: { taggedPosts: [], featuredPosts: [], categories: [], recentPosts: [] },
    }
  }
}

export default async function Home() {
  try {
    const { posts, initialData } = await getHomePageData()
    return <HomeContent initialPosts={posts} initialData={initialData} />
  } catch (error) {
    console.error("Homepage data fetch failed:", error)
    return <HomeContent initialPosts={[]} />
  }
}
