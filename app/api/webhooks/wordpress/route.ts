import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { SUPPORTED_COUNTRIES, getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import { CACHE_TAGS, KV_CACHE_KEYS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { kvCache } from "@/lib/cache/kv"

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

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("WORDPRESS_WEBHOOK_SECRET not configured")
    return false
  }

  const expectedSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")

  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))
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
      postTitle: post?.title?.rendered,
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
