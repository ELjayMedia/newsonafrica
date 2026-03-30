import { NextResponse } from "next/server"

import { fetchRecentPosts, fetchCategories } from "@/lib/wordpress/service"
import { siteConfig } from "@/config/site"
import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"

export const revalidate = 1800

export async function GET() {
  const baseUrl = siteConfig.url.replace(/\/$/, "")

  const [posts, categories] = await Promise.all([
    fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT),
    fetchCategories(),
  ])

  const categoryXml = (categories ?? [])
    .flatMap((category: { slug?: string | null }) =>
      SUPPORTED_COUNTRIES.map((country: string) => {
        if (!category.slug) {
          return ""
        }

        return `
  <url>
    <loc>${baseUrl}${getCategoryUrl(category.slug, country)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      }),
    )
    .join("")

  const postsXml = (posts ?? [])
    .map((post: { slug?: string | null; country?: string | null; databaseId?: number | null }) => {
      if (!post.slug) {
        return ""
      }

      return `
  <url>
    <loc>${baseUrl}${getArticleUrl(post.slug, post.country ?? undefined, post.databaseId ?? undefined)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    })
    .join("")

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${categoryXml}${postsXml}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  })
}
