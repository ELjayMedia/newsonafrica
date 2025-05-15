import type { MetadataRoute } from "next"
import { fetchCategories, fetchPosts, fetchTags, fetchAuthors } from "@/lib/wordpress-api"
import { siteConfig } from "@/config/site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch data for sitemap
    const [posts, categories, tags, authors] = await Promise.all([
      fetchPosts({ perPage: 100 }),
      fetchCategories(),
      fetchTags(),
      fetchAuthors(),
    ])

    // Static pages
    const staticPages = [
      {
        url: siteConfig.url,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
      {
        url: `${siteConfig.url}/news`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${siteConfig.url}/business`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${siteConfig.url}/special-projects`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${siteConfig.url}/subscribe`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
      {
        url: `${siteConfig.url}/privacy-policy`,
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.3,
      },
      {
        url: `${siteConfig.url}/terms-of-service`,
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.3,
      },
    ]

    // Post pages
    const postPages = posts.map((post) => ({
      url: `${siteConfig.url}/post/${post.slug}`,
      lastModified: new Date(post.modified),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

    // Category pages
    const categoryPages = categories.map((category) => ({
      url: `${siteConfig.url}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))

    // Tag pages
    const tagPages = tags.map((tag) => ({
      url: `${siteConfig.url}/tag/${tag.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))

    // Author pages
    const authorPages = authors.map((author) => ({
      url: `${siteConfig.url}/author/${author.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))

    // Combine all pages
    return [...staticPages, ...postPages, ...categoryPages, ...tagPages, ...authorPages].filter(
      (page) => !page.url.includes("/video-analysis") && !page.url.includes("/video-dashboard"),
    )
  } catch (error) {
    console.error("Error generating sitemap:", error)

    // Return minimal sitemap in case of error
    return [
      {
        url: siteConfig.url,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
    ]
  }
}
