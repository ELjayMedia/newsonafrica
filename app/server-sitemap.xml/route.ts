import { NextResponse } from "next/server"
import { fetchPosts, fetchTags, fetchAuthors } from "@/lib/wordpress"
import { getCategories } from "@/lib/api/wordpress"
import { siteConfig } from "@/config/site"

export async function GET() {
  const baseUrl = siteConfig.url || "https://newsonafrica.com"

  try {
    // Fetch core data in parallel
    const [posts, tags, authors] = await Promise.all([
      fetchPosts(1000),
      fetchTags(),
      fetchAuthors(),
    ])

    // Fetch categories for each supported country
    const countryCodes = (process.env.NEXT_PUBLIC_SUPPORTED_COUNTRIES ||
      process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ||
      "").split(",").filter(Boolean)
    const categoriesByCountry = await Promise.all(
      countryCodes.map((code) => getCategories(code)),
    )

    // Build the sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`

    // Add posts
    posts.forEach((post) => {
      const postDate = new Date(post.modified || post.date).toISOString()

      sitemap += `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    ${
      post.featuredImage?.node?.sourceUrl
        ? `
    <image:image>
      <image:loc>${post.featuredImage.node.sourceUrl}</image:loc>
      <image:title>${post.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")}</image:title>
    </image:image>`
        : ""
    }
  </url>`
    })

    // Add categories for each country edition
    countryCodes.forEach((code, idx) => {
      categoriesByCountry[idx].forEach((category) => {
        sitemap += `
  <url>
    <loc>${baseUrl}/${code}/category/${category.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
      })
    })

    // Add tags
    tags.forEach((tag) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/tag/${tag.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    })

    // Add authors
    authors.forEach((author) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/author/${author.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    })

    sitemap += `
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch (error) {
    console.error("Error generating server sitemap:", error)
    return new NextResponse("Error generating server sitemap", { status: 500 })
  }
}
