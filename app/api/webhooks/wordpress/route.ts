import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { createHmac, timingSafeEqual } from "node:crypto"
import { SUPPORTED_COUNTRIES, getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import { CACHE_TAGS, KV_CACHE_KEYS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { kvCache } from "@/lib/cache/kv"
import {
  deleteLegacyPostRoute,
  setLegacyPostRoute,
} from "@/lib/legacy-routes"

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

const derivePrimaryCategorySlug = (
  post: any,
  categorySlugs: string[],
): string | null => {
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
  if (signature.length !== expectedSignature.length) {
    return false
  }

  try {
    const providedBuffer = Buffer.from(signature, "hex")
    const expectedBuffer = Buffer.from(expectedSignature, "hex")

    if (providedBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(providedBuffer, expectedBuffer)
  } catch (error) {
    if (error instanceof TypeError) {
      return false
    }
    throw error
  }
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

          const resolvedCountry = deriveCountryFromPost(post)
          const primaryCategorySlug = derivePrimaryCategorySlug(post, categorySlugs)

          if (resolvedCountry && primaryCategorySlug) {
            await setLegacyPostRoute({
              slug: post.slug,
              country: resolvedCountry,
              primaryCategory: primaryCategorySlug,
            })
          }

          // Revalidate the specific post page for all supported countries
          for (const country of SUPPORTED_COUNTRIES) {
            revalidatePath(getArticleUrl(post.slug, country))

            buildCacheTags({
              country,
              section: "news",
            }).forEach((tag) => tagsToRevalidate.add(tag))

            buildCacheTags({
              country,
              section: "posts",
            }).forEach((tag) => tagsToRevalidate.add(tag))

            buildCacheTags({
              country,
              section: "post",
              extra: [`slug:${post.slug}`],
            }).forEach((tag) => tagsToRevalidate.add(tag))

            if (postId) {
              buildCacheTags({
                country,
                section: "related",
                extra: [`post:${postId}`],
              }).forEach((tag) => tagsToRevalidate.add(tag))
            }

            buildCacheTags({ country, section: "categories" }).forEach((tag) => tagsToRevalidate.add(tag))
            categorySlugs.forEach((slug) => {
              buildCacheTags({
                country,
                section: "categories",
                extra: [`category:${slug}`],
              }).forEach((tag) => tagsToRevalidate.add(tag))
            })

            buildCacheTags({ country, section: "tags" }).forEach((tag) => tagsToRevalidate.add(tag))
            tagSlugs.forEach((slug) => {
              buildCacheTags({
                country,
                section: "tags",
                extra: [`tag:${slug}`],
              }).forEach((tag) => tagsToRevalidate.add(tag))
            })

            if (tagSlugs.includes("fp")) {
              buildCacheTags({ country, section: "frontpage", extra: ["tag:fp"] }).forEach((tag) =>
                tagsToRevalidate.add(tag),
              )
            }

            if (tagSlugs.includes("featured")) {
              buildCacheTags({ country, section: "featured", extra: ["tag:featured"] }).forEach((tag) =>
                tagsToRevalidate.add(tag),
              )
            }
          }
          if (postId) {
            revalidateByTag(CACHE_TAGS.POST(postId))
          }

          // Revalidate category pages if categories are present
          if (post.categories?.length > 0) {
            for (const categoryId of post.categories) {
              revalidateByTag(CACHE_TAGS.CATEGORY(categoryId))
            }
          }

          // Revalidate home page to show latest posts
          revalidatePath("/")
          revalidateByTag(CACHE_TAGS.POSTS)
          buildCacheTags({ country: "all", section: "home" }).forEach((tag) =>
            tagsToRevalidate.add(tag),
          )

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

          await deleteLegacyPostRoute(post.slug)

          // Revalidate pages that might have referenced this post
          for (const country of SUPPORTED_COUNTRIES) {
            revalidatePath(getArticleUrl(post.slug, country))

            buildCacheTags({ country, section: "news" }).forEach((tag) => tagsToRevalidate.add(tag))
            buildCacheTags({ country, section: "posts" }).forEach((tag) => tagsToRevalidate.add(tag))
            buildCacheTags({ country, section: "post", extra: [`slug:${post.slug}`] }).forEach((tag) =>
              tagsToRevalidate.add(tag),
            )

            if (postId) {
              buildCacheTags({ country, section: "related", extra: [`post:${postId}`] }).forEach((tag) =>
                tagsToRevalidate.add(tag),
              )
            }

            buildCacheTags({ country, section: "categories" }).forEach((tag) => tagsToRevalidate.add(tag))
            categorySlugs.forEach((slug) => {
              buildCacheTags({ country, section: "categories", extra: [`category:${slug}`] }).forEach((tag) =>
                tagsToRevalidate.add(tag),
              )
            })

            buildCacheTags({ country, section: "tags" }).forEach((tag) => tagsToRevalidate.add(tag))
            tagSlugs.forEach((slug) => {
              buildCacheTags({ country, section: "tags", extra: [`tag:${slug}`] }).forEach((tag) =>
                tagsToRevalidate.add(tag),
              )
            })
          }

          if (post.categories?.length > 0) {
            for (const categoryId of post.categories) {
              revalidateByTag(CACHE_TAGS.CATEGORY(categoryId))
            }
          }
          revalidatePath("/")
          revalidateByTag(CACHE_TAGS.POSTS)
          buildCacheTags({ country: "all", section: "home" }).forEach((tag) =>
            tagsToRevalidate.add(tag),
          )

          await kvCache.delete(KV_CACHE_KEYS.HOME_FEED)

          if (postId) {
            revalidateByTag(CACHE_TAGS.POST(postId))
          }

          tagsToRevalidate.forEach((tag) => revalidateByTag(tag))

          console.log(`Revalidated after deletion: ${post.slug}`)
        }
        break

      case "category_updated":
        if (post?.slug) {
          // Revalidate country-specific category pages
          for (const country of SUPPORTED_COUNTRIES) {
            revalidatePath(getCategoryUrl(post.slug, country))
          }
          // Legacy path
          revalidatePath(`/category/${post.slug}`)
          revalidateByTag(CACHE_TAGS.CATEGORY(post.id))

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
