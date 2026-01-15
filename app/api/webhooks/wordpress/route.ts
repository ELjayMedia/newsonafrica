import type { NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { SUPPORTED_COUNTRIES, getArticleUrl } from "@/lib/utils/routing"
import { KV_CACHE_KEYS } from "@/lib/cache/constants"
import { cacheTags } from "@/lib/cache/cacheTags"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { kvCache } from "@/lib/cache/kv"
import { deleteLegacyPostRoute, setLegacyPostRoute } from "@/lib/legacy-routes"
import { syncPostToIndex, deletePostFromIndex } from "@/lib/supabase/search"
import { stripHtml } from "@/lib/search"

export const runtime = "nodejs"

// Cache policy: none (webhook endpoint)
export const revalidate = 0

const WEBHOOK_SECRET = process.env.WORDPRESS_WEBHOOK_SECRET

const extractTermSlugs = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const slugs = new Set<string>()
  for (const item of value) {
    if (item && typeof item === "object" && "slug" in item) {
      const slug = (item as { slug?: string }).slug
      if (typeof slug === "string" && slug.trim()) {
        slugs.add(slug.trim().toLowerCase())
      }
    } else if (typeof item === "string" && item.trim()) {
      slugs.add(item.trim().toLowerCase())
    }
  }

  return Array.from(slugs)
}

const extractCategorySlugs = (post: any): string[] => {
  const slugs = new Set<string>()

  extractTermSlugs(post?.terms?.category).forEach((slug) => slugs.add(slug))

  const embeddedTerms = post?._embedded?.["wp:term"]
  if (Array.isArray(embeddedTerms)) {
    for (const group of embeddedTerms) {
      if (!Array.isArray(group)) continue
      for (const term of group) {
        if (term && typeof term === "object" && term.taxonomy === "category") {
          const slug = typeof term.slug === "string" ? term.slug.trim().toLowerCase() : null
          if (slug) {
            slugs.add(slug)
          }
        }
      }
    }
  }

  return Array.from(slugs)
}

const extractTagSlugs = (post: any): string[] => {
  const slugs = new Set<string>()

  extractTermSlugs(post?.terms?.post_tag).forEach((slug) => slugs.add(slug))

  const embeddedTerms = post?._embedded?.["wp:term"]
  if (Array.isArray(embeddedTerms)) {
    for (const group of embeddedTerms) {
      if (!Array.isArray(group)) continue
      for (const term of group) {
        if (term && typeof term === "object" && term.taxonomy === "post_tag") {
          const slug = typeof term.slug === "string" ? term.slug.trim().toLowerCase() : null
          if (slug) {
            slugs.add(slug)
          }
        }
      }
    }
  }

  return Array.from(slugs)
}

const normalizeCountry = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return SUPPORTED_COUNTRIES.includes(normalized) ? normalized : null
}

const deriveCountryFromPost = (post: any): string | null => {
  const candidates: unknown[] = [
    post?.meta?.country,
    post?.meta?.Country,
    post?.meta?._country,
    post?.meta?._nc_country,
    post?.meta?._nc_default_country,
    post?.meta?.country_code,
    post?.country,
    post?.Country,
    post?.country_code,
    post?.primary_country,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeCountry(candidate)
    if (normalized) {
      return normalized
    }
  }

  const linkCandidates = [post?.link, post?.permalink, post?.guid?.rendered]
  for (const link of linkCandidates) {
    if (typeof link !== "string" || !link.trim()) {
      continue
    }

    try {
      const parsed = new URL(link, "https://placeholder.local")
      const segments = parsed.pathname.split("/").filter(Boolean)
      if (segments.length > 0) {
        const normalized = normalizeCountry(segments[0])
        if (normalized) {
          return normalized
        }
      }
    } catch {
      // ignore parsing errors and continue
    }
  }

  return null
}

const normalizeSlug = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized || null
}

const derivePrimaryCategorySlug = (post: any, categorySlugs: string[]): string | null => {
  const candidates: unknown[] = [
    post?.primary_category,
    post?.primaryCategory,
    post?.primary_category_slug,
    post?.primaryCategorySlug,
    post?.yoast_head_json?.primary_category,
    post?.yoast_head_json?.primary_category_slug,
    post?.meta?._primary_category,
    post?.meta?._primary_category_slug,
    post?.meta?._yoast_wpseo_primary_category_slug,
  ]

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && "slug" in candidate) {
      const normalized = normalizeSlug((candidate as { slug?: string }).slug)
      if (normalized) {
        return normalized
      }
    }

    const normalized = normalizeSlug(candidate)
    if (normalized) {
      return normalized
    }
  }

  if (categorySlugs.length > 0) {
    return categorySlugs[0]
  }

  return null
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("WORDPRESS_WEBHOOK_SECRET not configured")
    return false
  }

  const expectedSignature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")
  const providedBuffer = Buffer.from(signature, "hex")
  const expectedBuffer = Buffer.from(expectedSignature, "hex")

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export async function POST(request: NextRequest) {
  logRequest(request)
  try {
    const body = await request.text()
    const signature = request.headers.get("x-wp-signature")

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(body, signature.replace("sha256=", ""))
      if (!isValid) {
        console.error("Invalid webhook signature")
        return jsonWithCors(request, { error: "Invalid signature" }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    const { action, post } = data

    console.log(`WordPress webhook received: ${action}`, {
      postId: post?.id,
      postTitle: post?.title?.rendered ?? post?.title,
      postSlug: post?.slug,
    })

    // Handle different webhook actions
    switch (action) {
      case "post_published":
      case "post_updated":
        if (post?.slug) {
          const categorySlugs = extractCategorySlugs(post)
          const tagSlugs = extractTagSlugs(post)
          const tagsToRevalidate = new Set<string>()
          const postId = typeof post.id === "number" || typeof post.id === "string" ? String(post.id) : null
          const postIdentifier = postId ?? post.slug

          const resolvedCountry = deriveCountryFromPost(post)
          const primaryCategorySlug = derivePrimaryCategorySlug(post, categorySlugs)

          if (resolvedCountry && primaryCategorySlug) {
            await setLegacyPostRoute({
              slug: post.slug,
              country: resolvedCountry,
              primaryCategory: primaryCategorySlug,
            })
          }

          if (resolvedCountry && postId) {
            const title = post?.title?.rendered || post?.title || "Untitled"
            const excerpt = post?.excerpt?.rendered || post?.excerpt || ""
            const content = post?.content?.rendered || post?.content || ""
            const publishedAt = post?.date || post?.date_gmt || new Date().toISOString()
            const author = post?.author?.name || post?.author || ""
            const featuredImageUrl =
              post?.featured_image_url || post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null

            await syncPostToIndex({
              edition_code: resolvedCountry,
              wp_post_id: Number.parseInt(postId, 10),
              slug: post.slug,
              title: stripHtml(title),
              excerpt: stripHtml(excerpt),
              content_plain: stripHtml(content).slice(0, 5000), // Limit content to 5000 chars
              tags: tagSlugs,
              categories: categorySlugs,
              author: stripHtml(author),
              published_at: publishedAt,
              url_path: getArticleUrl(post.slug, resolvedCountry),
              featured_image_url: featuredImageUrl,
            })

            console.log(`[v0] Synced post ${postId} to search index for ${resolvedCountry}`)
          }

          const revalidationCountries = resolvedCountry ? [resolvedCountry] : SUPPORTED_COUNTRIES

          // Revalidate the specific post tags for all supported countries
          for (const country of revalidationCountries) {
            tagsToRevalidate.add(cacheTags.edition(country))
            tagsToRevalidate.add(cacheTags.home(country))
            if (postIdentifier) {
              tagsToRevalidate.add(cacheTags.post(country, postIdentifier))
            }

            categorySlugs.forEach((slug) => {
              tagsToRevalidate.add(cacheTags.category(country, slug))
            })

            tagSlugs.forEach((slug) => {
              tagsToRevalidate.add(cacheTags.tag(country, slug))
            })
          }

          // Revalidate home page to show latest posts
          tagsToRevalidate.add(cacheTags.home("all"))

          await kvCache.delete(KV_CACHE_KEYS.HOME_FEED)

          tagsToRevalidate.forEach((tag) => revalidateByTag(tag))

          console.log(`Revalidated post: ${post.slug}`)
        }
        break

      case "post_deleted":
        if (post?.slug) {
          const categorySlugs = extractCategorySlugs(post)
          const tagSlugs = extractTagSlugs(post)
          const tagsToRevalidate = new Set<string>()
          const postId = typeof post.id === "number" || typeof post.id === "string" ? String(post.id) : null
          const postIdentifier = postId ?? post.slug
          const resolvedCountry = deriveCountryFromPost(post)
          const revalidationCountries = resolvedCountry ? [resolvedCountry] : SUPPORTED_COUNTRIES

          await deleteLegacyPostRoute(post.slug)

          if (resolvedCountry && postId) {
            await deletePostFromIndex(resolvedCountry, Number.parseInt(postId, 10))
            console.log(`[v0] Deleted post ${postId} from search index for ${resolvedCountry}`)
          }

          // Revalidate pages that might have referenced this post
          for (const country of revalidationCountries) {
            tagsToRevalidate.add(cacheTags.edition(country))
            tagsToRevalidate.add(cacheTags.home(country))
            if (postIdentifier) {
              tagsToRevalidate.add(cacheTags.post(country, postIdentifier))
            }

            categorySlugs.forEach((slug) => {
              tagsToRevalidate.add(cacheTags.category(country, slug))
            })

            tagSlugs.forEach((slug) => {
              tagsToRevalidate.add(cacheTags.tag(country, slug))
            })
          }
          tagsToRevalidate.add(cacheTags.home("all"))

          await kvCache.delete(KV_CACHE_KEYS.HOME_FEED)

          tagsToRevalidate.forEach((tag) => revalidateByTag(tag))

          console.log(`Revalidated after deletion: ${post.slug}`)
        }
        break

      case "category_updated":
        if (post?.slug) {
          const resolvedCountry = deriveCountryFromPost(post)
          const revalidationCountries = resolvedCountry ? [resolvedCountry] : SUPPORTED_COUNTRIES

          for (const country of revalidationCountries) {
            revalidateByTag(cacheTags.category(country, post.slug))
          }

          console.log(`Revalidated category: ${post.slug}`)
        }
        break

      default:
        console.log(`Unhandled webhook action: ${action}`)
    }

    return jsonWithCors(request, {
      success: true,
      message: "Webhook processed successfully",
      action,
      postId: post?.id,
    })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return jsonWithCors(request, { error: "Failed to process webhook" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  logRequest(request)
  return jsonWithCors(request, {
    message: "WordPress webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
