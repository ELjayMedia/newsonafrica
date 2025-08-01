import { NextResponse } from "next/server"
import { getCategories } from "@/lib/api/wordpress"
import { fetchRecentPosts } from "@/lib/wordpress"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newsonafrica.com"

  try {
    const countryCodes = (process.env.NEXT_PUBLIC_SUPPORTED_COUNTRIES ||
      process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ||
      "").split(",").filter(Boolean)

    const [posts, categoriesByCountry] = await Promise.all([
      fetchRecentPosts(100),
      Promise.all(countryCodes.map((code) => getCategories(code))),
    ])

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${categoriesByCountry
    .flatMap((categories, idx) =>
      categories.map(
        (category) => `
  <url>
    <loc>${baseUrl}/${countryCodes[idx]}/category/${category.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
    )
    .join("")}
  ${posts
    .map(
      (post) => `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
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

