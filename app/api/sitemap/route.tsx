import { NextResponse } from "next/server"
<<<<<<< HEAD
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { toSitemapCountry } from "@/lib/wordpress/adapters/sitemap-post"
import { logRequest, withCors } from "@/lib/api-utils"
import { ENV } from "@/config/env"
import { fetchCategories, fetchRecentPosts } from "@/lib/wordpress/service"

=======

import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { fetchCategories, fetchRecentPosts } from "@/lib/wordpress/service"
import { ENV } from "@/config/env"
import { logRequest, withCors } from "@/lib/api-utils"
import { getArticleUrl, getCategoryUrl, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import type { WordPressCategory, WordPressPost } from "@/types/wp"

export const revalidate = 1800
export const runtime = "nodejs"

<<<<<<< HEAD
>>>>>>> 6375c06c (Resolve sitemap route merge inconsistencies)
type SitemapCategory = {
  slug?: string | null
}

type SitemapPost = {
  slug?: string | null
  country?: string | null
  databaseId?: number | null
}
=======
type SitemapCategory = Pick<WordPressCategory, "slug">
type SitemapPost = Pick<WordPressPost, "slug" | "databaseId"> & { country?: string | null }
>>>>>>> 5d957f30 (Update sitemap route to use default category fetch)

<<<<<<< HEAD
const fetchAllCategories = async (): Promise<SitemapCategory[]> => {
  return []
}

const fetchRecentPosts = async (_limit: number = 100): Promise<SitemapPost[]> => {
  return []
}

// Cache policy: long (30 minutes)
export const revalidate = 1800
export const runtime = "nodejs"

<<<<<<< HEAD
=======
>>>>>>> 6375c06c (Resolve sitemap route merge inconsistencies)
=======
type SitemapCategory = {
  slug?: string
}

type SitemapPost = {
  slug?: string
  country?: string
  databaseId?: number
}

>>>>>>> f26db92f (Resolve sitemap route merge regression)
export async function GET(request: Request) {
  logRequest(request)

  const baseUrl =
    typeof ENV.NEXT_PUBLIC_SITE_URL === "string"
      ? ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : ""

  try {
<<<<<<< HEAD
    const [categories, posts] = await Promise.all([fetchAllCategories(), fetchRecentPosts(100)])
=======
    const [categories, posts] = await Promise.all([
      fetchCategories(),
<<<<<<< HEAD
      fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT),
=======
      fetchRecentPosts(100),
>>>>>>> f26db92f (Resolve sitemap route merge regression)
    ])
>>>>>>> 6375c06c (Resolve sitemap route merge inconsistencies)

<<<<<<< HEAD
    const safeCategories = (Array.isArray(categories) ? categories : []).filter(
      (category): category is SitemapCategory & { slug: string } => typeof category?.slug === "string" && category.slug.length > 0,
    )

    const safePosts = (Array.isArray(posts) ? posts : []).filter(
      (post): post is SitemapPost & { slug: string } => typeof post?.slug === "string" && post.slug.length > 0,
    )
=======
    const safeCategories = (Array.isArray(categories) ? categories : []) as SitemapCategory[]
    const safePosts = (Array.isArray(posts) ? posts : []) as SitemapPost[]
>>>>>>> f26db92f (Resolve sitemap route merge regression)

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${safeCategories
<<<<<<< HEAD
    .flatMap((category) =>
      SUPPORTED_COUNTRIES.map(
        (country) => `
=======
        .flatMap((category) =>
          SUPPORTED_COUNTRIES.map(
            (country) => {
              if (!category.slug) {
                return ""
              }

              return `
>>>>>>> f26db92f (Resolve sitemap route merge regression)
  <url>
    <loc>${baseUrl}${getCategoryUrl(category.slug, country)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
<<<<<<< HEAD
  </url>`,
      ),
    )
    .join("")}
  ${safePosts
    .map(
      (post) => `
=======
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
>>>>>>> f26db92f (Resolve sitemap route merge regression)
  <url>
<<<<<<< HEAD
<<<<<<< HEAD
    <loc>${baseUrl}${getArticleUrl(post.slug, toSitemapCountry(post))}</loc>
=======
    <loc>${baseUrl}${getArticleUrl(post.slug, post.country, post.databaseId)}</loc>
>>>>>>> c0256ba1 (Adopt stable ID canonical article URLs)
=======
    <loc>${baseUrl}${getArticleUrl(post.slug, post.country ?? undefined, post.databaseId ?? undefined)}</loc>
>>>>>>> 6375c06c (Resolve sitemap route merge inconsistencies)
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
<<<<<<< HEAD
  </url>`,
    )
    .join("")}
=======
  </url>`
          },
        )
        .join("")}
>>>>>>> f26db92f (Resolve sitemap route merge regression)
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
