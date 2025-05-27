import type { NextApiRequest, NextApiResponse } from "next"
import { fetchAllCategories, fetchRecentPosts } from "@/lib/wordpress-api"

const BASE_URL = process.env.SITE_URL || "https://newsonafrica.com"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Content-Type", "text/xml")

  try {
    const [categories, recentPosts] = await Promise.all([
      fetchAllCategories(),
      fetchRecentPosts(100), // Fetch the 100 most recent posts
    ])

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${BASE_URL}</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      ${categories
        .map(
          (category) => `
        <url>
          <loc>${BASE_URL}/category/${category.slug}</loc>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `,
        )
        .join("")}
      ${recentPosts.nodes
        .map(
          (post) => `
        <url>
          <loc>${BASE_URL}/post/${post.slug}</loc>
          <changefreq>monthly</changefreq>
          <priority>0.6</priority>
        </url>
      `,
        )
        .join("")}
    </urlset>`

    res.write(xml)
    res.end()
  } catch (error) {
    console.error("Error generating sitemap:", error)
    res.status(500).end("Error generating sitemap")
  }
}
