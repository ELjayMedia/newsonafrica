import { NextResponse } from "next/server"
import { env } from "@/config/env"
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout"
import { decodeHtmlEntities } from "@/lib/utils/decodeHtmlEntities"
import { ensureNitroCdnUrl } from "@/lib/utils/nitroImage"
import type { HomePost } from "@/types/home"

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 50

const extractPosts = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as any).posts)) {
    return (payload as any).posts
  }
  return []
}

const resolveRenderedText = (value: unknown): string => {
  if (typeof value === "string") {
    return decodeHtmlEntities(value)
  }
  if (
    value &&
    typeof value === "object" &&
    "rendered" in value &&
    typeof (value as { rendered?: unknown }).rendered === "string"
  ) {
    return decodeHtmlEntities((value as { rendered?: string }).rendered ?? "")
  }
  return ""
}

const normalizeFeaturedImage = (item: any): HomePost["featuredImage"] | undefined => {
  const candidate = item?.featuredImage || item?.featured_image
  if (candidate && typeof candidate === "object") {
    const node = (candidate as any).node || candidate
    if (node && typeof node === "object") {
      const sourceUrl =
        typeof node.sourceUrl === "string"
          ? node.sourceUrl
          : typeof node.source_url === "string"
            ? node.source_url
            : typeof node.url === "string"
              ? node.url
              : undefined
      const altText =
        typeof node.altText === "string"
          ? node.altText
          : typeof node.alt_text === "string"
            ? node.alt_text
            : typeof node.alt === "string"
              ? node.alt
              : undefined
      const normalizedSource = ensureNitroCdnUrl(sourceUrl)
      if (normalizedSource) {
        return {
          node: {
            sourceUrl: normalizedSource,
            altText,
          },
        }
      }
    }
  }

  const directUrl =
    typeof item?.featuredImageUrl === "string"
      ? item.featuredImageUrl
      : typeof item?.featured_image_url === "string"
        ? item.featured_image_url
        : undefined

  const normalizedDirect = ensureNitroCdnUrl(directUrl)
  if (normalizedDirect) {
    return {
      node: {
        sourceUrl: normalizedDirect,
      },
    }
  }

  return undefined
}

const normalizeMostReadPost = (post: unknown, fallbackCountry: string): HomePost | null => {
  if (!post || typeof post !== "object") {
    return null
  }

  const item = post as Record<string, unknown>
  const slug = typeof item.slug === "string" ? item.slug : ""
  const title = resolveRenderedText(item.title)

  if (!slug || !title) {
    return null
  }

  const rawId = item.id ?? slug
  const id = typeof rawId === "string" ? rawId : String(rawId)
  const excerpt = resolveRenderedText(item.excerpt)
  const date = typeof item.date === "string" ? item.date : ""
  const country = typeof item.country === "string" ? item.country : fallbackCountry
  const featuredImage = normalizeFeaturedImage(item)

  return {
    id,
    slug,
    title,
    excerpt,
    date,
    country,
    featuredImage,
  }
}

const getBaseAnalyticsUrl = () => {
  const base = env.ANALYTICS_API_BASE_URL?.trim() || "https://newsonafrica.com/api/analytics"
  return base.replace(/\/?$/, "")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const countryParam = searchParams.get("country")?.toLowerCase()
  const country = countryParam && countryParam.length > 0 ? countryParam : env.NEXT_PUBLIC_DEFAULT_SITE || "sz"
  const limitParam = Number(searchParams.get("limit"))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), MAX_LIMIT) : DEFAULT_LIMIT

  const upstream = new URL(`${getBaseAnalyticsUrl()}/most-read`)
  upstream.searchParams.set("country", country)
  upstream.searchParams.set("limit", String(limit))

  try {
    const response = await fetchWithTimeout(upstream.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      const message = await response.text().catch(() => "")
      return NextResponse.json(
        { error: message || "Failed to fetch most-read posts" },
        { status: response.status },
      )
    }

    const payload = await response.json().catch(() => [])
    const posts = extractPosts(payload)
      .map((post) => normalizeMostReadPost(post, country))
      .filter((post): post is HomePost => Boolean(post))
      .slice(0, limit)

    return NextResponse.json(posts)
  } catch (error) {
    console.error("[api/most-read] Failed to proxy most-read posts", error)
    return NextResponse.json(
      { error: "Failed to fetch most-read posts" },
      { status: 502 },
    )
  }
}
