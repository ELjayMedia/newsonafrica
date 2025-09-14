import type { NextRequest } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { applyRateLimit, handleApiError, successResponse } from "@/lib/api-utils"

// Input validation schema
const revalidateSchema = z.object({
  secret: z.string().min(1),
  path: z.string().optional(),
  tag: z.string().optional(),
  type: z.enum(["content", "sitemaps", "all"]).optional().default("all"),
})

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "REVALIDATE_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const { secret, path, tag, type } = revalidateSchema.parse(params)

    if (secret !== process.env.REVALIDATION_SECRET) {
      throw new Error("Invalid revalidation secret")
    }

    const results: any = {
      revalidated: true,
      now: Date.now(),
      actions: [],
    }

    // Handle specific path or tag revalidation
    if (path || tag) {
      if (path) {
        revalidatePath(path)
        results.actions.push(`Revalidated path: ${path}`)
      }
      if (tag) {
        revalidateTag(tag)
        results.actions.push(`Revalidated tag: ${tag}`)
      }
      return successResponse(results)
    }

    // Handle bulk revalidation based on type
    if (type === "content" || type === "all") {
      // Revalidate main content paths
      const contentPaths = [
        "/",
        "/sport",
        "/entertainment",
        "/life",
        "/health",
        "/politics",
        "/food",
        "/opinion",
      ]

      contentPaths.forEach((path) => {
        revalidatePath(path)
      })

      // Revalidate content tags
      const contentTags = ["posts", "categories", "featured", "trending"]
      contentTags.forEach((tag) => {
        revalidateTag(tag)
      })

      results.actions.push("Revalidated all content paths and tags")
    }

    if (type === "sitemaps" || type === "all") {
      // Revalidate all sitemap paths
      const sitemapPaths = ["/sitemap.xml", "/sitemap-index.xml", "/server-sitemap.xml"]

      sitemapPaths.forEach((path) => {
        revalidatePath(path)
      })

      results.actions.push("Revalidated all sitemap files")
    }

    return successResponse(results)
  } catch (error) {
    return handleApiError(error)
  }
}
