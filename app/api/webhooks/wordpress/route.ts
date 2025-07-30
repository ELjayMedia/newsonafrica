import { type NextRequest, NextResponse } from "next/server"
import { revalidateTag, revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import crypto from "crypto"
import { fetchSinglePost } from "@/lib/wordpress"
import { createAdminClient } from "@/lib/supabase"

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
  try {
    const body = await request.text()
    const signature = request.headers.get("x-wp-signature")

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(body, signature.replace("sha256=", ""))
      if (!isValid) {
        console.error("Invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    const { action, post } = data

    const supabase = createAdminClient(cookies())

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
          // Update bookmark records with fresh data
          if (post.id) {
            const postId = String(post.id)
            const { data: existing } = await supabase
              .from("bookmarks")
              .select("id")
              .eq("post_id", postId)

            if (existing && existing.length > 0) {
              const latest = await fetchSinglePost(post.slug)

              if (latest) {
                await supabase
                  .from("bookmarks")
                  .update({
                    title: latest.title || "",
                    slug: latest.slug || "",
                    excerpt: latest.excerpt || "",
                    featuredImage: latest.featuredImage
                      ? JSON.stringify(latest.featuredImage)
                      : null,
                  })
                  .eq("post_id", postId)
              }
            }
          }

          // Revalidate the specific post page
          revalidatePath(`/post/${post.slug}`)
          revalidateTag(`post-${post.id}`)

          // Revalidate category pages if categories are present
          if (post.categories?.length > 0) {
            for (const categoryId of post.categories) {
              revalidateTag(`category-${categoryId}`)
            }
          }

          // Revalidate home page to show latest posts
          revalidatePath("/")
          revalidateTag("posts")

          console.log(`Revalidated post: ${post.slug}`)
        }
        break

      case "post_deleted":
        if (post?.id) {
          await supabase.from("bookmarks").delete().eq("post_id", String(post.id))
        }
        if (post?.slug) {
          // Revalidate pages that might have referenced this post
          revalidatePath(`/post/${post.slug}`)
          revalidatePath("/")
          revalidateTag("posts")

          console.log(`Revalidated after deletion: ${post.slug}`)
        }
        break

      case "category_updated":
        if (post?.slug) {
          revalidatePath(`/category/${post.slug}`)
          revalidateTag(`category-${post.id}`)

          console.log(`Revalidated category: ${post.slug}`)
        }
        break

      default:
        console.log(`Unhandled webhook action: ${action}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      action,
      postId: post?.id,
    })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "WordPress webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
