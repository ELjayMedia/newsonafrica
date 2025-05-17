import { NextResponse } from "next/server"
import algoliasearch from "algoliasearch"
import { fetchSinglePost } from "@/lib/wordpress-api"
import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

// Transform a WordPress post to an Algolia record
function transformPostToAlgoliaRecord(post: any) {
  return {
    objectID: `post-${post.id}`,
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt?.replace(/<[^>]*>/g, "") || "",
    content: post.content?.replace(/<[^>]*>/g, "") || "",
    publishDate: new Date(post.date).getTime(),
    modifiedDate: new Date(post.modified).getTime(),
    featuredImage: post.featuredImage?.node?.sourceUrl || null,
    author: {
      name: post.author?.node?.name || "",
      slug: post.author?.node?.slug || "",
    },
    categories: post.categories?.nodes?.map((cat: any) => cat.name) || [],
    categorySlugs: post.categories?.nodes?.map((cat: any) => cat.slug) || [],
    tags: post.tags?.nodes?.map((tag: any) => tag.name) || [],
    tagSlugs: post.tags?.nodes?.map((tag: any) => tag.slug) || [],
    // Add other fields as needed
    popularity: 1,
    lastIndexed: Date.now(),
  }
}

// Log webhook activity to Supabase
async function logWebhookActivity(action: string, postId: string, status: string, details: string) {
  try {
    const supabase = createClient(cookies())
    await supabase.from("algolia_webhook_logs").insert({
      action,
      post_id: postId,
      status,
      details,
    })
  } catch (error) {
    console.error("Failed to log webhook activity:", error)
    // Continue execution even if logging fails
  }
}

export async function POST(request: Request) {
  // Clone the request so we can use the body twice
  const clonedRequest = request.clone()

  // Get the raw body for signature verification
  const rawBody = await clonedRequest.text()

  try {
    // Verify webhook signature from WordPress
    const signature = request.headers.get("x-wp-webhook-signature")
    const webhookSecret = process.env.WORDPRESS_WEBHOOK_SECRET

    if (!webhookSecret || !signature || signature !== webhookSecret) {
      await logWebhookActivity("signature_failure", "unknown", "error", "Invalid webhook signature")
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
    }

    // Parse the webhook payload
    const body = JSON.parse(rawBody)

    // Log webhook event
    const supabase = createClient(cookies())
    await supabase.from("algolia_webhook_logs").insert({
      event_type: body.type || "unknown",
      payload: body,
    })

    // Initialize Algolia client
    const client = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "", process.env.ALGOLIA_ADMIN_API_KEY || "")

    const index = client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "")

    // Handle different webhook events
    switch (body.action) {
      case "publish":
      case "update": {
        try {
          // Fetch the latest post data
          const post = await fetchSinglePost(body.post.slug)

          if (!post) {
            await logWebhookActivity(body.action, body.post.id.toString(), "error", "Post not found")
            return NextResponse.json({ error: "Post not found" }, { status: 404 })
          }

          // Transform and update the post in Algolia
          const record = transformPostToAlgoliaRecord(post)
          await index.saveObject(record)

          // Revalidate the post page and related pages
          revalidatePath(`/post/${post.slug}`)
          revalidatePath("/")

          if (post.categories?.nodes?.length > 0) {
            post.categories.nodes.forEach((cat: any) => {
              revalidatePath(`/category/${cat.slug}`)
            })
          }

          await logWebhookActivity(body.action, post.id.toString(), "success", `Post "${post.title}" indexed`)
          return NextResponse.json({ success: true, message: "Post indexed", slug: post.slug })
        } catch (error) {
          console.error(`Error processing ${body.action} webhook:`, error)
          await logWebhookActivity(
            body.action,
            body.post.id.toString(),
            "error",
            error instanceof Error ? error.message : "Unknown error",
          )
          return NextResponse.json(
            {
              error: `Failed to process ${body.action}`,
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
          )
        }
      }

      case "delete": {
        try {
          // Remove the post from Algolia
          await index.deleteObject(`post-${body.post.id}`)

          // Revalidate the homepage and archives
          revalidatePath("/")

          await logWebhookActivity(
            "delete",
            body.post.id.toString(),
            "success",
            `Post ID ${body.post.id} removed from index`,
          )
          return NextResponse.json({ success: true, message: "Post removed from index" })
        } catch (error) {
          console.error("Error processing delete webhook:", error)
          await logWebhookActivity(
            "delete",
            body.post.id.toString(),
            "error",
            error instanceof Error ? error.message : "Unknown error",
          )
          return NextResponse.json(
            {
              error: "Failed to process delete",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
          )
        }
      }

      case "batch": {
        try {
          // Handle batch operations
          if (Array.isArray(body.posts)) {
            const operations = await Promise.allSettled(
              body.posts.map(async (postData: any) => {
                if (postData.status === "deleted") {
                  return index.deleteObject(`post-${postData.id}`)
                } else {
                  const post = await fetchSinglePost(postData.slug)
                  if (post) {
                    const record = transformPostToAlgoliaRecord(post)
                    return index.saveObject(record)
                  }
                  return Promise.reject(`Post not found: ${postData.slug}`)
                }
              }),
            )

            // Count successes and failures
            const results = {
              total: operations.length,
              succeeded: operations.filter((op) => op.status === "fulfilled").length,
              failed: operations.filter((op) => op.status === "rejected").length,
            }

            await logWebhookActivity(
              "batch",
              "multiple",
              results.failed === 0 ? "success" : "partial",
              `Batch processed: ${results.succeeded} succeeded, ${results.failed} failed`,
            )

            // Revalidate homepage
            revalidatePath("/")

            return NextResponse.json({
              success: true,
              message: "Batch processed",
              results,
            })
          }

          await logWebhookActivity("batch", "unknown", "error", "Invalid batch format")
          return NextResponse.json({ error: "Invalid batch format" }, { status: 400 })
        } catch (error) {
          console.error("Error processing batch webhook:", error)
          await logWebhookActivity(
            "batch",
            "multiple",
            "error",
            error instanceof Error ? error.message : "Unknown error",
          )
          return NextResponse.json(
            {
              error: "Failed to process batch",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
          )
        }
      }

      default:
        await logWebhookActivity(
          body.action || "unknown",
          body.post?.id?.toString() || "unknown",
          "ignored",
          "Event not handled",
        )
        return NextResponse.json({ message: "Event not handled" }, { status: 200 })
    }
  } catch (error) {
    console.error("Error handling WordPress webhook:", error)
    await logWebhookActivity("unknown", "unknown", "error", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Implement webhook signature verification
function verifyWebhookSignature(signature: string, payload: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.WORDPRESS_WEBHOOK_SECRET || "")
      .update(payload)
      .digest("hex")

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch (error) {
    console.error("Signature verification error:", error)
    return false
  }
}
