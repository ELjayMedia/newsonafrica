import { NextResponse } from "next/server"
import { fetchRecentPosts } from "@/lib/wordpress"
import { siteConfig } from "@/config/site"

export async function GET() {
  const baseUrl = siteConfig.url || "https://newsonafrica.com"

  try {
    // Fetch recent posts (last 2 days)
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    // Increase limit to ensure we get all recent news
    const recentPosts = await fetchRecentPosts(200)
    const filteredPosts = recentPosts.filter((post) => new Date(post.date) > twoDaysAgo)

    // Build the news sitemap
    const newsSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${filteredPosts
    .map((post) => {
      const postDate = new Date(post.date)
      const categories = post.categories?.nodes || []
      const keywords = categories.map((cat) => cat.name).join(", ")

      // Properly escape XML content
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
    .join("")}
</urlset>`

    return new NextResponse(newsSitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch (error) {
    console.error("Error generating news sitemap:", error)
    return new NextResponse("Error generating news sitemap", { status: 500 })
  }
}
