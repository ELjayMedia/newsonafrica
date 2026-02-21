import { NextResponse } from "next/server"

import { siteConfig } from "@/config/site"
import { fetchPosts } from "@/lib/wordpress/service"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

import {
  CACHE_CONTROL_HEADER,
  NEWS_NAMESPACE,
  NEWS_SITEMAP_WINDOW_MS,
  SITEMAP_NAMESPACE,
  XML_DECLARATION,
  buildNewsUrlElement,
  filterPostsByCutoff,
} from "../utils"

const AFRICAN_EDITION_CODE = "african-edition"
const PUBLICATION_LANGUAGE = "en"

export async function GET() {
  const baseUrl = siteConfig.url || "https://app.newsonafrica.com"
  const publicationName = siteConfig.name || "News On Africa"

  let result
  try {
    result = await fetchPosts({ perPage: 100, countryCode: AFRICAN_EDITION_CODE })
  } catch (error) {
    console.error("Error fetching posts for African news sitemap:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 502 })
  }

  const posts = Array.isArray(result) ? result : result?.data ?? []
  const cutoff = Date.now() - NEWS_SITEMAP_WINDOW_MS
  const recentPosts = filterPostsByCutoff(posts, cutoff)

  const urlEntries = recentPosts
    .map((post) =>
      buildNewsUrlElement(post, {
        baseUrl,
        publicationName,
        language: PUBLICATION_LANGUAGE,
        fallbackCountry: DEFAULT_COUNTRY,
      }),
    )
    .filter((entry) => entry.length > 0)
    .join("\n")

  const sitemap = `${XML_DECLARATION}
<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:news="${NEWS_NAMESPACE}">
${urlEntries}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": CACHE_CONTROL_HEADER,
    },
  })
}
