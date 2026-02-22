import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { REVALIDATION_SECRET, WORDPRESS_WEBHOOK_SECRET } from "@/config/env"
import { isValidCountry } from "@/lib/countries"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { cacheTags } from "@/lib/cache/cacheTags"

type RevalidatePayload = {
  secret?: unknown
  country?: unknown
  countryCode?: unknown
  slug?: unknown
  postId?: unknown
  categories?: unknown
  tags?: unknown
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized || null
}

const normalizeCountry = (value: unknown): string => {
  const country = normalizeString(value)
  return country && isValidCountry(country) ? country : DEFAULT_COUNTRY
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const items = new Set<string>()
  for (const item of value) {
    const normalized = normalizeString(item)
    if (normalized) {
      items.add(normalized)
    }
  }

  return Array.from(items)
}

export async function POST(request: NextRequest) {
  try {
    const headerSecret = request.headers.get("X-Revalidate-Secret")
    const body = (await request.json()) as RevalidatePayload
    const bodySecret = typeof body.secret === "string" ? body.secret : undefined

    const expectedSecret = REVALIDATION_SECRET || WORDPRESS_WEBHOOK_SECRET
    const providedSecret = headerSecret || bodySecret

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const countryCode = normalizeCountry(body.countryCode ?? body.country)
    const slug = normalizeString(body.slug)
    const postId = body.postId != null ? String(body.postId).trim() : null

    const tags = new Set<string>([cacheTags.edition(countryCode), cacheTags.home(countryCode)])

    if (slug) {
      tags.add(cacheTags.post(countryCode, postId || slug))
      tags.add(cacheTags.postSlug(countryCode, slug))
    } else if (postId) {
      tags.add(cacheTags.post(countryCode, postId))
    }

    normalizeStringArray(body.categories).forEach((category) => {
      tags.add(cacheTags.category(countryCode, category))
    })

    normalizeStringArray(body.tags).forEach((tag) => {
      tags.add(cacheTags.tag(countryCode, tag))
    })

    Array.from(tags).forEach((tag) => revalidateTag(tag))

    return NextResponse.json(
      {
        revalidated: true,
        tags: Array.from(tags),
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Revalidation error:", error)
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 })
  }
}
