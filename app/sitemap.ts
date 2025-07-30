import type { MetadataRoute } from "next"
import { fetchPosts, fetchCategories, fetchTags, fetchAuthors } from "@/lib/wordpress"
import { siteConfig } from "@/config/site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url || "https://newsonafrica.com"

  try {
    // Fetch all necessary data in parallel with increased limits
    const [posts, categories, tags, authors] = await Promise.all([
      fetchPosts(1000), // Increased limit to ensure we get all posts
      fetchCategories(),
      fetchTags(),
      fetchAuthors(),
    ])

    // Static pages
    const staticPages = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
      {
        url: `${baseUrl}/category/news`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/category/business`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/sport`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/special-projects`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/subscribe`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
      {
        url: `${baseUrl}/search`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
      {
        url: `${baseUrl}/auth`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      },
      {
        url: `${baseUrl}/privacy-policy`,
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.3,
      },
      {
        url: `${baseUrl}/terms-of-service`,
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.3,
      },
      {
        url: `${baseUrl}/sitemap.html`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      },
    ]

    // Post pages - include all metadata needed for news sitemaps
    const postPages = posts.map((post) => {
      const postDate = new Date(post.modified || post.date)
      const isRecent = Date.now() - postDate.getTime() < 2 * 24 * 60 * 60 * 1000 // 2 days

      return {
        url: `${baseUrl}/post/${post.slug}`,
        lastModified: postDate,
        changeFrequency: isRecent ? "daily" : ("weekly" as const),
        priority: isRecent ? 0.9 : 0.7,
        // Additional news sitemap data
        news: isRecent
          ? {
              publication: {
                name: "News On Africa",
                language: "en",
              },
              publicationDate: postDate,
              title: post.title,
              keywords: post.categories?.nodes?.map((cat) => cat.name).join(", ") || "",
            }
          : undefined,
        // Image data if available
        images: post.featuredImage?.node?.sourceUrl
          ? [
              {
                url: post.featuredImage.node.sourceUrl,
                title: post.title,
                alt: post.featuredImage.node.altText || post.title,
              },
            ]
          : undefined,
      }
    })

    // Category pages
    const categoryPages = categories.map((category) => ({
      url: `${baseUrl}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))

    // Tag pages
    const tagPages = tags.map((tag) => ({
      url: `${baseUrl}/tag/${tag.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))

    // Author pages
    const authorPages = authors.map((author) => ({
      url: `${baseUrl}/author/${author.slug}`,
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
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
    ]
  }
}
