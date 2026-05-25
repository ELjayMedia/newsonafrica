import { NextResponse, type NextRequest } from "next/server"

import { stripHtml } from "@/lib/search"
import { createAdminClient } from "@/lib/supabase/admin"
import { isEditionCode } from "@/lib/wordpress/editions-registry"
import { searchWordPressPosts } from "@/lib/wordpress-search"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type BackfillRequestBody = {
  country?: string
  limit?: number
  offset?: number
}

type SyncError = {
  wpPostId?: number
  slug?: string
  message: string
}

const MAX_LIMIT = 100

const getSyncSecret = () => process.env.CONTENT_SYNC_SECRET?.trim() || process.env.REVALIDATION_SECRET?.trim() || ""

const readAuthToken = (request: NextRequest) => {
  const headerToken = request.headers.get("x-content-sync-secret")?.trim()
  if (headerToken) return headerToken

  const authorization = request.headers.get("authorization")?.trim()
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim()
  }

  return ""
}

const normalizeLimit = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return MAX_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

const normalizeOffset = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

const updateCursor = async (
  supabase: ReturnType<typeof createAdminClient>,
  editionCode: string,
  status: "running" | "completed" | "failed",
  errorMessage?: string,
) => {
  const payload: {
    edition_code: string
    sync_status: string
    error_message: string | null
    updated_at: string
    last_synced_at?: string
  } = {
    edition_code: editionCode,
    sync_status: status,
    error_message: errorMessage ?? null,
    updated_at: new Date().toISOString(),
  }

  if (status === "completed") {
    payload.last_synced_at = new Date().toISOString()
  }

  await supabase.from("content_sync_cursor").upsert(payload)
}

export async function POST(request: NextRequest) {
  const expectedSecret = getSyncSecret()

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Content sync secret is not configured" },
      { status: 500 },
    )
  }

  if (readAuthToken(request) !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as BackfillRequestBody
  const country = (body.country || "sz").trim().toLowerCase()

  if (!isEditionCode(country)) {
    return NextResponse.json({ error: `Unsupported edition: ${country}` }, { status: 400 })
  }

  const limit = normalizeLimit(body.limit)
  const offset = normalizeOffset(body.offset)
  const page = Math.floor(offset / limit) + 1
  const errors: SyncError[] = []
  let synced = 0

  const supabase = createAdminClient()

  await updateCursor(supabase, country, "running")

  try {
    const response = await searchWordPressPosts("*", {
      country,
      page,
      perPage: limit,
      orderBy: "date",
      order: "desc",
    })

    for (const post of response.results) {
      const wpPostId = post.databaseId || Number.parseInt(post.id || "0", 10)

      if (!wpPostId) {
        errors.push({ slug: post.slug, message: "Missing WordPress post ID" })
        continue
      }

      const title = stripHtml(post.title || "Untitled")
      const excerpt = stripHtml(post.excerpt || "")
      const contentPlain = stripHtml(post.content || "").slice(0, 5000)
      const categories = post.categories?.nodes?.map((category) => category?.name).filter(Boolean) || []
      const tags = post.tags?.nodes?.map((tag) => tag?.name).filter(Boolean) || []
      const author = post.author?.node?.name || ""
      const publishedAt = post.date || new Date().toISOString()
      const featuredImageUrl = post.featuredImage?.node?.sourceUrl || null

      const { error } = await supabase.from("content_index").upsert(
        {
          edition_code: country,
          wp_post_id: wpPostId,
          slug: post.slug,
          title,
          excerpt,
          content_plain: contentPlain,
          tags,
          categories,
          author,
          published_at: publishedAt,
          url_path: `/${country}/article/${post.slug}`,
          featured_image_url: featuredImageUrl,
        },
        { onConflict: "edition_code,wp_post_id" },
      )

      if (error) {
        errors.push({ wpPostId, slug: post.slug, message: error.message })
      } else {
        synced += 1
      }
    }

    const status = errors.length > 0 ? "failed" : "completed"
    await updateCursor(
      supabase,
      country,
      status,
      errors.length > 0 ? `${errors.length} post(s) failed during sync` : undefined,
    )

    return NextResponse.json({
      editionCode: country,
      limit,
      offset,
      page,
      synced,
      fetched: response.results.length,
      hasMore: response.hasMore,
      total: response.total,
      status,
      errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown content sync error"
    await updateCursor(supabase, country, "failed", message)

    return NextResponse.json(
      {
        editionCode: country,
        limit,
        offset,
        page,
        synced,
        status: "failed",
        error: message,
      },
      { status: 500 },
    )
  }
}
