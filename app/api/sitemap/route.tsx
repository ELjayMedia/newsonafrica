import { NextResponse } from "next/server"

import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { fetchAllCategories, fetchRecentPosts } from "@/lib/wordpress/service"
import { ENV } from "@/config/env"
import { logRequest, withCors } from "@/lib/api-utils"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"

export const revalidate = 1800
export const runtime = "nodejs"

type SitemapCategory = {
  slug?: string | null
}

type SitemapPost = {
  slug?: string | null
  country?: string | null
  databaseId?: number | null
}

export async function GET(request: Request) {
  logRequest(request)

  const baseUrl =
    typeof ENV.NEXT_PUBLIC_SITE_URL === "string"
      ? ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : ""

  try {
    const [categories, posts] = await Promise.all([
      fetchAllCategories() as Promise<SitemapCategory[]>,
      fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT) as Promise<SitemapPost[]>,
    ])

    const safeCategories = (Array.isArray(categories) ? categories : []).filter(
      (category): category is SitemapCategory & { slug: string } => typeof category?.slug === "string" && category.slug.length > 0,
    )

    const safePosts = (Array.isArray(posts) ? posts : []).filter(
      (post): post is SitemapPost & { slug: string } => typeof post?.slug === "string" && post.slug.length > 0,
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
    <loc>${baseUrl}${getArticleUrl(post.slug, post.country ?? undefined, post.databaseId ?? undefined)}</loc>
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
    return withCors(
      request,
      new NextResponse("Error generating sitemap", { status: 500 }),
    )
  }
}
