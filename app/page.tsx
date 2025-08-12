import type { Metadata } from "next"
import { siteConfig } from "@/config/site"
import { HomeContent } from "@/components/HomeContent"
import { HomeShell } from "@/components/home/HomeShell"
import { getLatestPosts, getCategories, getPostsByCategory } from "@/lib/api/wordpress"
import { categoryConfigs } from "@/config/homeConfig"

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

async function getHomePageData(limit = 50) {
  try {
    // Fetch initial posts and categories in parallel
    const [postsResult, categoriesResult] = await Promise.allSettled([getLatestPosts(limit), getCategories()])

    const posts = postsResult.status === "fulfilled" ? (postsResult.value.posts ?? []) : []
    const categories = categoriesResult.status === "fulfilled" ? (categoriesResult.value.categories ?? []) : []

    const categoryPromises = categoryConfigs.map(async (config) => {
      try {
        const result = await getPostsByCategory(config.slug, 5)
        return { slug: config.slug, posts: result.posts || [] }
      } catch (error) {
        console.error(`Error fetching ${config.name} posts:`, error)
        return { slug: config.slug, posts: [] }
      }
    })

    const categoryResults = await Promise.allSettled(categoryPromises)
    const categoryPosts: Record<string, any[]> = {}

    categoryResults.forEach((result) => {
      if (result.status === "fulfilled") {
        categoryPosts[result.value.slug] = result.value.posts
      }
    })

    const fpTaggedPosts = posts.filter((post) =>
      post.tags?.nodes?.some((tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp"),
    )

    return {
      posts,
      initialData: {
        taggedPosts: fpTaggedPosts,
        featuredPosts: posts.slice(0, 6),
        categories,
        recentPosts: posts.slice(0, 10),
        categoryPosts,
      },
    }
  } catch (error) {
    console.error("Failed to fetch posts for homepage:", error)
    return {
      posts: [],
      initialData: {
        taggedPosts: [],
        featuredPosts: [],
        categories: [],
        recentPosts: [],
        categoryPosts: {},
      },
    }
  }
}

export default async function Home() {
  const { posts, initialData } = await getHomePageData()
  try {
    return (
      <HomeShell
        topStory={initialData.taggedPosts[0] ?? posts[0]}
        categoryPosts={initialData.categoryPosts}
        categories={initialData.categories}
      />
    )
  } catch (e) {
    return <HomeContent initialPosts={posts} initialData={initialData} />
  }
}
