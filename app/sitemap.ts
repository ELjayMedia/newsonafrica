import type { MetadataRoute } from "next"
import { fetchRecentPosts, fetchCategories, fetchTags, fetchAuthors } from "@/lib/wordpress-api"
import { siteConfig } from "@/config/site"
import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { toSitemapCountry } from "@/lib/wordpress/adapters/sitemap-post"

export const dynamic = "force-dynamic"
export const revalidate = 300

type CategoryNode = { name?: string }
type PostCategoryConnection = { nodes?: CategoryNode[] }

type FeaturedImageNode = { sourceUrl?: string; altText?: string }
type FeaturedImage = { node?: FeaturedImageNode }

type PostEntity = {
  slug: string
  country?: string
  date?: string
  modified?: string
  title?: string
  categories?: PostCategoryConnection
  featuredImage?: FeaturedImage
}

type SlugEntity = { slug?: string }
type CategoryEntity = { slug?: string }

function safeDate(value: unknown): Date {
  if (typeof value === "string" && value) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url || "https://app.newsonafrica.com"

  const postsPromise: Promise<PostEntity[]> = fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT)
    .then((res) => res as unknown as PostEntity[])
    .catch((err) => {
      console.warn("Failed to fetch posts for sitemap:", err instanceof Error ? err.message : err)
      return []
    })

  const categoriesPromise: Promise<CategoryEntity[]> = fetchCategories()
    .then((res) => res as unknown as CategoryEntity[])
    .catch((err) => {
      console.warn("Failed to fetch categories for sitemap:", err instanceof Error ? err.message : err)
      return []
    })

  const tagsPromise: Promise<SlugEntity[]> = fetchTags()
    .then((res) => res as unknown as SlugEntity[])
    .catch((err) => {
      console.warn("Failed to fetch tags for sitemap:", err instanceof Error ? err.message : err)
      return []
    })

  const authorsPromise: Promise<SlugEntity[]> = fetchAuthors()
    .then((res) => res as unknown as SlugEntity[])
    .catch((err) => {
      console.warn("Failed to fetch authors for sitemap:", err instanceof Error ? err.message : err)
      return []
    })

  const [posts, categories, tags, authors] = await Promise.all([
    postsPromise,
    categoriesPromise,
    tagsPromise,
    authorsPromise,
  ])

  try {
    const staticPages: MetadataRoute.Sitemap = [
      { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      { url: `${baseUrl}/subscribe`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
      { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
      { url: `${baseUrl}/auth`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
      { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
      { url: `${baseUrl}/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
      { url: `${baseUrl}/sitemap.html`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    ]

    const postPages: MetadataRoute.Sitemap = posts.map((post) => {
      const postDate = safeDate(post.modified || post.date)
      const isRecent = Date.now() - postDate.getTime() < 2 * 24 * 60 * 60 * 1000

      return {
        url: `${baseUrl}${getArticleUrl(post.slug, toSitemapCountry(post))}`,
        lastModified: postDate,
        changeFrequency: isRecent ? "daily" : "weekly",
        priority: isRecent ? 0.9 : 0.7,
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
        images: post.featuredImage?.node?.sourceUrl
          ? [
              {
                url: post.featuredImage.node.sourceUrl,
                title: post.title,
                alt: post.featuredImage.node.altText || post.title,
              },
            ]
          : undefined,
      } as MetadataRoute.Sitemap[number]
    })

    const categoryPages: MetadataRoute.Sitemap = categories
      .filter((category: CategoryEntity) => !!category?.slug)
      .flatMap((category: CategoryEntity) =>
        SUPPORTED_COUNTRIES.map((country) => ({
          url: `${baseUrl}${getCategoryUrl(category.slug as string, country)}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.7,
        })),
      )

    const tagPages: MetadataRoute.Sitemap = tags
      .filter((tag: SlugEntity) => !!tag?.slug)
      .map((tag: SlugEntity) => ({
        url: `${baseUrl}/tag/${tag.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      }))

    const authorPages: MetadataRoute.Sitemap = authors
      .filter((author: SlugEntity) => !!author?.slug)
      .map((author: SlugEntity) => ({
        url: `${baseUrl}/author/${author.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      }))

    return [...staticPages, ...postPages, ...categoryPages, ...tagPages, ...authorPages].filter(
      (page) => !page.url.includes("/video-analysis") && !page.url.includes("/video-dashboard"),
    )
  } catch (error) {
    console.warn("Error generating sitemap:", error instanceof Error ? error.message : error)
    return [{ url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 }]
  }
}
