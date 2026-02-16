import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { ENV } from "@/config/env"
import { isValidCountry } from "@/lib/countries"

/**
 * POST /api/revalidate
 *
 * Webhook endpoint for WordPress to trigger ISR revalidation
 * Revalidates cached articles and edition pages by tag
 *
 * Body:
 * {
 *   "secret": "WORDPRESS_WEBHOOK_SECRET",
 *   "countryCode": "sz",
 *   "slug": "article-slug"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify secret from header or body
    const headerSecret = request.headers.get("X-Revalidate-Secret")
    const body = (await request.json()) as Record<string, unknown>
    const bodySecret = typeof body.secret === "string" ? body.secret : undefined

    const providedSecret = headerSecret || bodySecret
    if (!providedSecret || providedSecret !== ENV.WORDPRESS_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract and validate country code
    const countryCode = String(body.countryCode || "").trim().toLowerCase()
    if (!isValidCountry(countryCode)) {
      return NextResponse.json(
        { error: `Invalid country code: ${countryCode}` },
        { status: 400 },
      )
    }

    // Extract and validate slug
    const slug = String(body.slug || "").trim().toLowerCase()
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 })
    }

    // Revalidate tags
    const tags = [
      `article-${slug}-${countryCode}`,
      `country-${countryCode}`,
    ]

    for (const tag of tags) {
      revalidateTag(tag)
    }

    return NextResponse.json(
      {
        revalidated: true,
        tags,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Revalidation error:", error)
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 })
  }
}

