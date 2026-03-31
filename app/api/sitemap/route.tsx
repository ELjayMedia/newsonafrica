import { NextResponse } from "next/server"

import { ENV } from "@/config/env"
import { logRequest, withCors } from "@/lib/api-utils"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { toSitemapCountry } from "@/lib/wordpress/adapters/sitemap-post"
import { fetchCategories, fetchRecentPosts } from "@/lib/wordpress/service"
import type { WordPressCategory, WordPressPost } from "@/types/wp"

// Cache policy: long (30 minutes)
export const revalidate = 1800
export const runtime = "nodejs"

const fetchAllCategories = async (): Promise<WordPressCategory[]> => fetchCategories()

const fetchRecentPostsForSitemap = async (limit = 100): Promise<WordPressPost[]> => fetchRecentPosts(limit)

export async function GET(request: Request) {
  logRequest(request)

  const baseUrl = typeof ENV.NEXT_PUBLIC_SITE_URL === "string" ? ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : ""

  try {
    const [categories, posts] = await Promise.all([fetchAllCategories(), fetchRecentPostsForSitemap(100)])

    const safeCategories = (Array.isArray(categories) ? categories : []).filter(
      (category): category is WordPressCategory & { slug: string } =>
        typeof category?.slug === "string" && category.slug.length > 0,
    )

    const safePosts = (Array.isArray(posts) ? posts : []).filter(
      (post): post is WordPressPost & { slug: string } => typeof post?.slug === "string" && post.slug.length > 0,
    )

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${safeCategories
    .flatMap((category) =>
      SUPPORTED_COUNTRIES.map(
        (country) => `
  <url>
    <loc>${baseUrl}${getCategoryUrl(category.slug, country)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
    )
    .join("")}
  ${safePosts
    .map(
      (post) => `
  <url>
    <loc>${baseUrl}${getArticleUrl(post.slug, toSitemapCountry(post), post.databaseId)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
    )
    .join("")}
</urlset>`

    return withCors(
      request,
      new NextResponse(sitemap, {
        headers: {
          "Content-Type": "application/xml",
        },
      }),
    )
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return withCors(request, new NextResponse("Error generating sitemap", { status: 500 }))
  }
}
