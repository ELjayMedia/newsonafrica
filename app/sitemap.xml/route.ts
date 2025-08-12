// Fixed imports to use correct file paths and exports
import { siteConfig } from "@/config/site"
import { fetchRecentPosts } from "@/lib/api/wordpress"
import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = siteConfig.url || "https://newsonafrica.com"

  try {
    // Fetch recent posts (last 2 days) for news sitemap
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { posts: recentPosts } = await fetchRecentPosts(200)
    const filteredPosts = recentPosts.filter((post) => new Date(post.date) > twoDaysAgo)

    // Generate static URLs inline instead of importing from missing file
    const staticUrls = `
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/subscribe</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`

    // Generate category URLs inline
    const categoryUrls = `
  <url>
    <loc>${baseUrl}/category/news</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/category/business</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/category/sport</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/category/entertainment</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`

    // Add news sitemap entries
    const newsSitemapEntries = filteredPosts
      .map((post) => {
        const postDate = new Date(post.date)
        const categories = post.categories?.nodes || []
        const keywords = categories.map((cat) => cat.name).join(", ")

        const escapedTitle = post.title
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;")

        return `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>News On Africa</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${postDate.toISOString()}</news:publication_date>
      <news:title>${escapedTitle}</news:title>
      ${keywords ? `<news:keywords>${keywords}</news:keywords>` : ""}
    </news:news>
    ${
      post.featuredImage?.node?.sourceUrl
        ? `
    <image:image>
      <image:loc>${post.featuredImage.node.sourceUrl}</image:loc>
      <image:title>${escapedTitle}</image:title>
    </image:image>`
        : ""
    }
  </url>`
      })
      .join("")

    // Build the complete sitemap with news namespace
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${staticUrls}
  ${categoryUrls}
  ${newsSitemapEntries}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return new NextResponse("Error generating sitemap", { status: 500 })
  }
}
