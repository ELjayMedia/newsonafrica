import type { NextRequest } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { applyRateLimit, handleApiError, successResponse } from "@/lib/api-utils"

// Input validation schema
const revalidateSchema = z.object({
  secret: z.string().min(1),
  path: z.string().optional(),
  tag: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "REVALIDATE_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const { secret, path, tag } = revalidateSchema.parse(params)

    if (secret !== process.env.REVALIDATION_SECRET) {
      throw new Error("Invalid revalidation secret")
    }

    if (!path && !tag) {
      throw new Error("Either path or tag must be provided")
    }

    if (path) {
      revalidatePath(path)
    }

    if (tag) {
      revalidateTag(tag)
    }

    return successResponse({
      revalidated: true,
      now: Date.now(),
      path,
      tag,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
