import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { SUPPORTED_COUNTRIES, getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"

// Cache policy: none (webhook endpoint)
export const revalidate = 0


const WEBHOOK_SECRET = process.env.WORDPRESS_WEBHOOK_SECRET

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
          // Revalidate the specific post page for all supported countries
          for (const country of SUPPORTED_COUNTRIES) {
            revalidatePath(getArticleUrl(post.slug, country))
          }
            revalidateByTag(CACHE_TAGS.POST(post.id))

          // Revalidate category pages if categories are present
          if (post.categories?.length > 0) {
            for (const categoryId of post.categories) {
                revalidateByTag(CACHE_TAGS.CATEGORY(categoryId))
            }
          }

          // Revalidate home page to show latest posts
          revalidatePath("/")
            revalidateByTag(CACHE_TAGS.POSTS)

          console.log(`Revalidated post: ${post.slug}`)
        }
        break

      case "post_deleted":
        if (post?.slug) {
          // Revalidate pages that might have referenced this post
          for (const country of SUPPORTED_COUNTRIES) {
            revalidatePath(getArticleUrl(post.slug, country))
          }
          revalidatePath("/")
            revalidateByTag(CACHE_TAGS.POSTS)

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
