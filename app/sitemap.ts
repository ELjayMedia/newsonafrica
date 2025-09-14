import logger from "@/utils/logger"
import type { MetadataRoute } from "next"
import { fetchPosts, fetchCategories, fetchTags, fetchAuthors } from "@/lib/wordpress-api"
import { siteConfig } from "@/config/site"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url || "https://newsonafrica.com"

  const postsPromise = fetchPosts(1000).catch((err) => {
    logger.warn(
      "Failed to fetch posts for sitemap:",
      err instanceof Error ? err.message : err,
    )
    return []
  })

  const categoriesPromise = fetchCategories().catch((err) => {
    logger.warn(
      "Failed to fetch categories for sitemap:",
      err instanceof Error ? err.message : err,
    )
    return []
  })

  const tagsPromise = fetchTags().catch((err) => {
    logger.warn(
      "Failed to fetch tags for sitemap:",
      err instanceof Error ? err.message : err,
    )
    return []
  })

  const authorsPromise = fetchAuthors().catch((err) => {
    logger.warn(
      "Failed to fetch authors for sitemap:",
      err instanceof Error ? err.message : err,
    )
    return []
  })

  const [posts, categories, tags, authors] = await Promise.all([
    postsPromise,
    categoriesPromise,
    tagsPromise,
    authorsPromise,
  ])

  try {
    // Static pages
    const staticPages = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
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
      const isRecent =
        Date.now() - postDate.getTime() < 2 * 24 * 60 * 60 * 1000 // 2 days

      return {
        url: `${baseUrl}${getArticleUrl(post.slug, (post as any)?.country)}`,
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
              keywords:
                post.categories?.nodes?.map((cat) => cat.name).join(", ") || "",
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
    const categoryPages = categories.flatMap((category) =>
      SUPPORTED_COUNTRIES.map((country) => ({
        url: `${baseUrl}${getCategoryUrl(category.slug, country)}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    )

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
    return [
      ...staticPages,
      ...postPages,
      ...categoryPages,
      ...tagPages,
      ...authorPages,
    ].filter(
      (page) =>
        !page.url.includes("/video-analysis") &&
        !page.url.includes("/video-dashboard"),
    )
  } catch (error) {
    logger.warn(
      "Error generating sitemap:",
      error instanceof Error ? error.message : error,
    )

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
