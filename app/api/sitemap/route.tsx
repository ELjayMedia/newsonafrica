import { NextResponse } from "next/server"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { logRequest, withCors } from "@/lib/api-utils"
import { ENV } from "@/config/env"
import { fetchCategories, fetchRecentPosts } from "@/lib/wordpress/service"

// Cache policy: long (30 minutes)
export const revalidate = 1800
export const runtime = "nodejs"

type SitemapCategory = {
  slug?: string
}

type SitemapPost = {
  slug?: string
  country?: string
  databaseId?: number
}

export async function GET(request: Request) {
  logRequest(request)

  const baseUrl =
    typeof ENV.NEXT_PUBLIC_SITE_URL === "string"
      ? ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : ""

  try {
    const [categories, posts] = await Promise.all([
      fetchCategories(),
      fetchRecentPosts(100),
    ])

    const safeCategories = (Array.isArray(categories) ? categories : []) as SitemapCategory[]
    const safePosts = (Array.isArray(posts) ? posts : []) as SitemapPost[]

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
            (country) => {
              if (!category.slug) {
                return ""
              }

              return `
  <url>
    <loc>${baseUrl}${getCategoryUrl(category.slug, country)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
            },
          ),
        )
        .join("")}
  ${safePosts
        .map(
          (post) => {
            if (!post.slug) {
              return ""
            }

            return `
  <url>
    <loc>${baseUrl}${getArticleUrl(post.slug, post.country, post.databaseId)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
          },
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
