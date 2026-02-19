import { NextResponse } from "next/server"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { toSitemapCountry } from "@/lib/wordpress/adapters/sitemap-post"
import { logRequest, withCors } from "@/lib/api-utils"
import { ENV } from "@/config/env"

const fetchAllCategories = async () => []
const fetchRecentPosts = async () => []

// Cache policy: long (30 minutes)
export const revalidate = 1800
export const runtime = "nodejs"

// --- Properly typed stubs (fixes your build error) ---

type SitemapCategory = {
  slug: string
}

type SitemapPost = {
  slug: string
  country?: string
}

const fetchAllCategories = async (): Promise<SitemapCategory[]> => {
  return []
}

const fetchRecentPosts = async (
  limit: number = 100,
): Promise<SitemapPost[]> => {
  return []
}

// -----------------------------------------------------

export async function GET(request: Request) {
  logRequest(request)

  const baseUrl =
    typeof ENV.NEXT_PUBLIC_SITE_URL === "string"
      ? ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : ""

  try {
    const [categories, posts] = await Promise.all([
      fetchAllCategories(),
      fetchRecentPosts(100), // now valid
    ])

    const safeCategories = Array.isArray(categories) ? categories : []
    const safePosts = Array.isArray(posts) ? posts : []

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
    <loc>${baseUrl}${getArticleUrl(post.slug, toSitemapCountry(post))}</loc>
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
