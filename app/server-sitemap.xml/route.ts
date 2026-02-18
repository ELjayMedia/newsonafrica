import { NextResponse } from "next/server"
import { fetchRecentPosts, fetchCategories, fetchTags, fetchAuthors, fetchCountries } from "@/lib/wordpress-api"
import { siteConfig } from "@/config/site"
import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function safeIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export async function GET() {
  const baseUrl = siteConfig.url || "https://app.newsonafrica.com"

  // Fetch everything
  let posts: Awaited<ReturnType<typeof fetchRecentPosts>>
  try {
    posts = await fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT)
  } catch (error) {
    console.error("Error fetching posts for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 502 })
  }

  let categories: Awaited<ReturnType<typeof fetchCategories>>
  try {
    categories = await fetchCategories()
  } catch (error) {
    console.error("Error fetching categories for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 502 })
  }

  let countries: Awaited<ReturnType<typeof fetchCountries>>
  try {
    countries = await fetchCountries()
  } catch (error) {
    console.error("Error fetching countries for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 502 })
  }

  let tags: Awaited<ReturnType<typeof fetchTags>>
  let authors: Awaited<ReturnType<typeof fetchAuthors>>
  try {
    ;[tags, authors] = await Promise.all([fetchTags(), fetchAuthors()])
  } catch (error) {
    console.error("Error fetching tags/authors for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch tags or authors" }, { status: 502 })
  }

  try {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`

    // Add posts
    posts.forEach((post) => {
      // FIX: avoid passing undefined into Date()
      const lastmod =
        safeIsoDate((post as any)?.modified) ??
        safeIsoDate((post as any)?.date) ??
        undefined

      const featuredUrl = (post as any)?.featuredImage?.node?.sourceUrl as string | undefined
      const title = typeof (post as any)?.title === "string" ? (post as any).title : ""

      sitemap += `
  <url>
    <loc>${baseUrl}${getArticleUrl((post as any).slug, (post as any)?.country)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    ${featuredUrl
          ? `
    <image:image>
      <image:loc>${featuredUrl}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
    </image:image>`
          : ""
        }
  </url>`
    })

    // Add categories for each country
    countries.forEach((c) => {
      categories.forEach((category) => {
        const code = (c as any)?.code as string | undefined
        const catSlug = (category as any)?.slug as string | undefined
        if (!code || !catSlug) return

        sitemap += `
  <url>
    <loc>${baseUrl}${getCategoryUrl(catSlug, code)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
      })
    })

    // Add tags
    tags.forEach((tag) => {
      const slug = (tag as any)?.slug as string | undefined
      if (!slug) return

      sitemap += `
  <url>
    <loc>${baseUrl}/tag/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    })

    // Add authors
    authors.forEach((author) => {
      const slug = (author as any)?.slug as string | undefined
      if (!slug) return

      sitemap += `
  <url>
    <loc>${baseUrl}/author/${slug}</loc>
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
