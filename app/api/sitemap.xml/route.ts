import { NextResponse } from "next/server"
import { fetchAllPosts, fetchAllCategories, fetchAllTags, fetchAllAuthors } from "@/lib/wordpress-api"
import { siteConfig } from "@/config/site"

export async function GET() {
  const baseUrl = siteConfig.url || "https://newsonafrica.com"

  try {
    // Fetch all necessary data in parallel
    const [posts, categories, tags, authors] = await Promise.all([
      fetchAllPosts(),
      fetchAllCategories(),
      fetchAllTags(),
      fetchAllAuthors(),
    ])

    // Start building the sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Home page -->
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>

  <!-- Main sections -->
  <url>
    <loc>${baseUrl}/news</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/business</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/sport</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/special-projects</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Categories -->
  ${categories
    .map(
      (category) => `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    ${category.modified ? `<lastmod>${new Date(category.modified).toISOString()}</lastmod>` : ""}
  </url>`,
    )
    .join("")}

  <!-- Tags -->
  ${tags
    .map(
      (tag) => `
  <url>
    <loc>${baseUrl}/tag/${tag.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
    )
    .join("")}

  <!-- Authors -->
  ${authors
    .map(
      (author) => `
  <url>
    <loc>${baseUrl}/author/${author.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
    )
    .join("")}

  <!-- Posts -->
  ${posts
    .map((post) => {
      const postDate = new Date(post.modified || post.date)
      const isRecent = Date.now() - postDate.getTime() < 2 * 24 * 60 * 60 * 1000 // 2 days

      return `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <lastmod>${postDate.toISOString()}</lastmod>
    <changefreq>${isRecent ? "daily" : "weekly"}</changefreq>
    <priority>${isRecent ? "0.9" : "0.6"}</priority>
    ${
      post.featuredImage?.node?.sourceUrl
        ? `
    <image:image>
      <image:loc>${post.featuredImage.node.sourceUrl}</image:loc>
      <image:title>${post.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")}</image:title>
    </image:image>`
        : ""
    }
    ${
      isRecent
        ? `
    <news:news>
      <news:publication>
        <news:name>News On Africa</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${postDate.toISOString()}</news:publication_date>
      <news:title>${post.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")}</news:title>
    </news:news>`
        : ""
    }
  </url>`
    })
    .join("")}

  <!-- Static pages -->
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy-policy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms-of-service</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return new NextResponse("Error generating sitemap", { status: 500 })
  }
}
