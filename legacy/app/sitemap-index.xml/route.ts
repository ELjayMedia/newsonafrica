import { NextResponse } from "next/server"

import { siteConfig } from "@/config/site"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"

import { CACHE_CONTROL_HEADER, XML_DECLARATION, escapeXml } from "../news-sitemap/utils"

export async function GET() {
  const baseUrl = siteConfig.url || "https://app.newsonafrica.com"
  const lastMod = new Date().toISOString()

  const sitemapEntries = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/server-sitemap.xml`,
    `${baseUrl}/news-sitemap.xml`,
    `${baseUrl}/news-sitemap/root`,
    ...SUPPORTED_COUNTRIES.map((country) => `${baseUrl}/news-sitemap/${country.code}`),
  ]

  const sitemapIndex = `${XML_DECLARATION}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`

  return new NextResponse(sitemapIndex, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": CACHE_CONTROL_HEADER,
    },
  })
}
