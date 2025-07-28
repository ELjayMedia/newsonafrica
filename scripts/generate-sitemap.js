const fs = require('fs')
const path = require('path')

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://newsonafrica.com'
const WP_REST_URL =
  process.env.WORDPRESS_REST_API_URL ||
  process.env.NEXT_PUBLIC_WORDPRESS_REST_API_URL ||
  'https://newsonafrica.com/sz/wp-json/wp/v2'

async function fetchPostSlugs() {
  const perPage = 100
  let page = 1
  const posts = []

  while (true) {
    const url = `${WP_REST_URL}/posts?per_page=${perPage}&page=${page}&_fields=slug,modified,date`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to fetch posts: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    posts.push(...data.map(p => ({ slug: p.slug, modified: p.modified || p.date })))
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '0', 10)
    if (page >= totalPages) break
    page += 1
  }
  return posts
}

async function generate() {
  try {
    console.log('Fetching WordPress slugs...')
    const posts = await fetchPostSlugs()
    console.log(`Fetched ${posts.length} posts`)

    const sitemapEntries = posts
      .map(p => `  <url>\n    <loc>${SITE_URL}/post/${p.slug}</loc>\n    <lastmod>${new Date(p.modified).toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`)
      .join('\n')

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>`

    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml')
    fs.writeFileSync(sitemapPath, sitemap)
    console.log(`Wrote ${sitemapPath}`)

    const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt')
    fs.writeFileSync(robotsPath, robots)
    console.log(`Wrote ${robotsPath}`)
  } catch (err) {
    console.error('Error generating sitemap:', err)
    process.exit(1)
  }
}

generate()
