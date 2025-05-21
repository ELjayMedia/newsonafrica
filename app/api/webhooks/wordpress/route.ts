import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, action, post } = body

    // Verify webhook using the API key from WP Webhooks Pro
    // This assumes the API key is passed in the request body or as a query parameter
    const url = new URL(request.url)
    const apiKey = url.searchParams.get("wpwhpro_api_key")

    if (apiKey !== process.env.WORDPRESS_WEBHOOK_SECRET) {
      console.log("Invalid webhook API key")
      return NextResponse.json({ error: "Invalid webhook API key" }, { status: 401 })
    }

    console.log("Webhook received:", { type, action })

    if (type === "post" && (action === "publish" || action === "update")) {
      // Revalidate the specific post
      revalidatePath(`/post/${post.slug}`)

      // Revalidate category pages if needed
      if (post.categories) {
        post.categories.forEach((category: any) => {
          revalidatePath(`/category/${category.slug}`)
        })
      }

      // Revalidate tag pages if needed
      if (post.tags) {
        post.tags.forEach((tag: any) => {
          revalidatePath(`/tag/${tag.slug}`)
        })
      }

      // Revalidate author page
      if (post.author) {
        revalidatePath(`/author/${post.author.slug}`)
      }

      // Revalidate homepage
      revalidatePath("/")

      // Revalidate sitemaps
      revalidatePath("/api/sitemap.xml")
      revalidatePath("/api/news-sitemap.xml")

      try {
        // Revalidate sitemaps
        await fetch(`${process.env.SITE_URL}/api/revalidate-sitemaps?secret=${process.env.REVALIDATION_SECRET}`)
        console.log("Sitemaps revalidation triggered")
      } catch (error) {
        console.error("Failed to trigger sitemap revalidation:", error)
      }

      return NextResponse.json({
        revalidated: true,
        message: `Revalidated post: ${post.slug}`,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ message: "No action taken" })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
