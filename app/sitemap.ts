import type { MetadataRoute } from "next"

import { fetchRecentPosts, fetchCategories } from "@/lib/wordpress/service"
import { siteConfig } from "@/config/site"
import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/$/, "")

  const [posts, categories] = await Promise.all([
    fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT),
    fetchCategories(),
  ])

  const categoryEntries: MetadataRoute.Sitemap = (categories ?? [])
    .flatMap((category: { slug?: string | null }) =>
      SUPPORTED_COUNTRIES.map((country: string) => {
        if (!category.slug) {
          return null
        }

        return {
          url: `${baseUrl}${getCategoryUrl(category.slug, country)}`,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }
      }),
    )
    .filter((entry: MetadataRoute.Sitemap[number] | null): entry is MetadataRoute.Sitemap[number] => Boolean(entry))

  const postEntries: MetadataRoute.Sitemap = (posts ?? [])
    .filter((post: { slug?: string | null }) => Boolean(post.slug))
    .map((post: { slug?: string | null; country?: string | null; databaseId?: number | null; modified?: string | null; date?: string | null }) => ({
      url: `${baseUrl}${getArticleUrl(post.slug ?? "", post.country ?? undefined, post.databaseId ?? undefined)}`,
      lastModified: post.modified || post.date || new Date().toISOString(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))

  return [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    ...categoryEntries,
    ...postEntries,
  ]
}
