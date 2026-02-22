import { NextResponse } from "next/server"
import { fetchRecentPosts, fetchCategories, fetchTags, fetchAuthors, fetchCountries } from "@/lib/wordpress/service"
import { siteConfig } from "@/config/site"
import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"

type SlugEntity = { slug?: string }
type CountryEntity = { code?: string }
type CategoryEntity = { slug?: string }

type PostEntity = {
  slug: string
  country?: string
  date?: string
  modified?: string
  title?: string
  featuredImage?: { node?: { sourceUrl?: string } }
}

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

  let posts: PostEntity[] = []
  try {
    posts = (await fetchRecentPosts(SITEMAP_RECENT_POST_LIMIT)) as unknown as PostEntity[]
  } catch (error) {
    console.error("Error fetching posts for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 502 })
  }

  let categories: CategoryEntity[] = []
  try {
    categories = (await fetchCategories()) as unknown as CategoryEntity[]
  } catch (error) {
    console.error("Error fetching categories for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 502 })
  }

  let countries: CountryEntity[] = []
  try {
    countries = (await fetchCountries()) as unknown as CountryEntity[]
  } catch (error) {
    console.error("Error fetching countries for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 502 })
  }

  let tags: SlugEntity[] = []
  let authors: SlugEntity[] = []
  try {
    const [t, a] = await Promise.all([fetchTags(), fetchAuthors()])
    tags = t as unknown as SlugEntity[]
    authors = a as unknown as SlugEntity[]
  } catch (error) {
    console.error("Error fetching tags/authors for server sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch tags or authors" }, { status: 502 })
  }

  try {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`

    // Posts
    posts.forEach((post: PostEntity) => {
      const lastmod =
        safeIsoDate(post.modified) ??
        safeIsoDate(post.date) ??
        undefined

      const featuredUrl = post.featuredImage?.node?.sourceUrl
      const title = typeof post.title === "string" ? post.title : ""

      sitemap += `
  <url>
    <loc>${baseUrl}${getArticleUrl(post.slug, post.country, post.databaseId)}</loc>
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

    // Categories per country
    countries.forEach((c: CountryEntity) => {
      const code = c.code
      if (!code) return

      categories.forEach((category: CategoryEntity) => {
        const catSlug = category.slug
        if (!catSlug) return

        sitemap += `
  <url>
    <loc>${baseUrl}${getCategoryUrl(catSlug, code)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
      })
    })

    // Tags
    tags.forEach((tag: SlugEntity) => {
      const slug = tag.slug
      if (!slug) return

      sitemap += `
  <url>
    <loc>${baseUrl}/tag/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    })

    // Authors
    authors.forEach((author: SlugEntity) => {
      const slug = author.slug
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
