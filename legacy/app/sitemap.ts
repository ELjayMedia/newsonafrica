import type { MetadataRoute } from "next"

import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { siteConfig } from "@/config/site"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { toSitemapCountry } from "@/lib/wordpress/adapters/sitemap-post"
import { fetchAuthors, fetchCategories, fetchRecentPosts, fetchTags } from "@/lib/wordpress/service"

export const revalidate = 300

type CategoryNode = { name?: string }
type PostCategoryConnection = { nodes?: CategoryNode[] }

type FeaturedImageNode = { sourceUrl?: string; altText?: string }
type FeaturedImage = { node?: FeaturedImageNode }

type PostEntity = {
  slug: string
  country?: string
  databaseId?: number
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

const getBaseUrl = () => (siteConfig.url || "https://app.newsonafrica.com").replace(/\/+$/, "")

const buildStaticPages = (baseUrl: string): MetadataRoute.Sitemap => {
  const now = new Date()

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    ...SUPPORTED_COUNTRIES.map((country) => ({
      url: `${baseUrl}/${country}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: `${baseUrl}/subscribe`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/auth`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/sitemap.html`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ]
}

const filterPrivateRoutes = (pages: MetadataRoute.Sitemap): MetadataRoute.Sitemap =>
  pages.filter(
    (page) => !page.url.includes("/video-analysis") && !page.url.includes("/video-dashboard"),
  )

async function safeFetchSitemapEntities<T>(
  label: string,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  try {
    const result = await fetcher()
    return Array.isArray(result) ? result : []
  } catch (error) {
    console.warn(`Failed to fetch ${label} for sitemap:`, error instanceof Error ? error.message : error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const staticPages = buildStaticPages(baseUrl)

  try {
    const [posts, categories, tags, authors] = await Promise.all([
      safeFetchSitemapEntities<PostEntity>("posts", async () =>
        (await fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT)) as unknown as PostEntity[],
      ),
      safeFetchSitemapEntities<CategoryEntity>("categories", async () =>
        (await fetchCategories()) as unknown as CategoryEntity[],
      ),
      safeFetchSitemapEntities<SlugEntity>("tags", async () =>
        (await fetchTags()) as unknown as SlugEntity[],
      ),
      safeFetchSitemapEntities<SlugEntity>("authors", async () =>
        (await fetchAuthors()) as unknown as SlugEntity[],
      ),
    ])

    const postPages: MetadataRoute.Sitemap = posts
      .filter((post) => !!post?.slug)
      .map((post) => {
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
      .filter((category) => !!category?.slug)
      .flatMap((category) =>
        SUPPORTED_COUNTRIES.map((country) => ({
          url: `${baseUrl}${getCategoryUrl(category.slug as string, country)}`,
          lastModified: new Date(),
          changeFrequency: "daily" as const,
          priority: 0.7,
        })),
      )

    const tagPages: MetadataRoute.Sitemap = tags
      .filter((tag) => !!tag?.slug)
      .map((tag) => ({
        url: `${baseUrl}/tag/${tag.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }))

    const authorPages: MetadataRoute.Sitemap = authors
      .filter((author) => !!author?.slug)
      .map((author) => ({
        url: `${baseUrl}/author/${author.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }))

    return filterPrivateRoutes([
      ...staticPages,
      ...postPages,
      ...categoryPages,
      ...tagPages,
      ...authorPages,
    ])
  } catch (error) {
    console.warn("Error generating sitemap; returning static fallback:", error instanceof Error ? error.message : error)
    return filterPrivateRoutes(staticPages)
  }
}
