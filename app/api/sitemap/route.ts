// TODO: Implement these functions or ensure they exist in @/lib/wordpress-api
const fetchAllCategories = async () => []
const fetchRecentPosts = async () => []

import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newsonafrica.com"

  try {
    const [categories, posts] = await Promise.all([fetchAllCategories(), fetchRecentPosts(100)])

    // Ensure categories and posts are arrays, even if empty
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
    .map(
      (category) => `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `,
    )
    .join("")}
  ${safePosts
    .map(
      (post) => `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  `,
    )
    .join("")}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        "Content-Type": "application/xml",
      },
    })
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return new NextResponse("Error generating sitemap", { status: 500 })
  }
}
