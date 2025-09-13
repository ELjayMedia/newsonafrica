import { NextResponse } from "next/server"
import { fetchPosts, fetchCategories, fetchTags, fetchAuthors, fetchCountries } from "@/lib/wordpress-api"
import { siteConfig } from "@/config/site"

export async function GET() {
  const baseUrl = siteConfig.url || "https://newsonafrica.com"

  let posts
  try {
    posts = await fetchPosts(1000)
  } catch (error) {
    console.error("Error fetching posts for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 502 })
  }

  let categories
  try {
    categories = await fetchCategories()
  } catch (error) {
    console.error("Error fetching categories for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 502 })
  }

  let _countries
  try {
    _countries = await fetchCountries()
  } catch (error) {
    console.error("Error fetching countries for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 502 })
  }

  let tags
  let authors
  try {
    ;[tags, authors] = await Promise.all([fetchTags(), fetchAuthors()])
  } catch (error) {
    console.error("Error fetching tags/authors for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch tags or authors" }, { status: 502 })
  }

  try {
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

    // Add categories
    categories.forEach((category) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
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
