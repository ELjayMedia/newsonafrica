import { NextResponse } from "next/server"

import { siteConfig } from "@/config/site"
import { fetchPosts } from "@/lib/wordpress-api"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"

import {
  CACHE_CONTROL_HEADER,
  NEWS_NAMESPACE,
  NEWS_SITEMAP_WINDOW_MS,
  SITEMAP_NAMESPACE,
  XML_DECLARATION,
  buildNewsUrlElement,
  deriveLanguageFromHreflang,
  filterPostsByCutoff,
} from "../utils"

interface RouteContext {
  params: { countryCode: string }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const countryCode = params.countryCode?.toLowerCase()
  const edition = SUPPORTED_COUNTRIES.find((country) => country.code === countryCode)

  if (!edition) {
    return NextResponse.json({ error: "Country not supported" }, { status: 404 })
  }

  const baseUrl = siteConfig.url || "https://app.newsonafrica.com"
  const publicationName = siteConfig.name || "News On Africa"

  let result
  try {
    result = await fetchPosts({ perPage: 100, countryCode: edition.code })
  } catch (error) {
    console.error(`Error fetching posts for ${edition.code} news sitemap:`, error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 502 })
  }

  const posts = Array.isArray(result) ? result : result?.data ?? []
  const cutoff = Date.now() - NEWS_SITEMAP_WINDOW_MS
  const recentPosts = filterPostsByCutoff(posts, cutoff)
  const language = deriveLanguageFromHreflang(edition.hreflang)

  const urlEntries = recentPosts
    .map((post) =>
      buildNewsUrlElement(post, {
        baseUrl,
        publicationName,
        language,
        fallbackCountry: edition.code,
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
