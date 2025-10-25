import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { applyRateLimit, handleApiError, successResponse, withCors, logRequest } from "@/lib/api-utils"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import {
  ValidationError,
  addValidationError,
  hasValidationErrors,
  type FieldErrors,
} from "@/lib/validation"

export const runtime = "nodejs"

// Cache policy: none (manual revalidation endpoint)
export const revalidate = 0

const REVALIDATE_TYPES = ["content", "sitemaps", "all"] as const
type RevalidateType = (typeof REVALIDATE_TYPES)[number]

function validateRevalidateParams(searchParams: URLSearchParams) {
  const errors: FieldErrors = {}

  const secretValue = searchParams.get("secret")
  const secret = secretValue && secretValue.trim().length > 0 ? secretValue.trim() : ""
  if (!secret) {
    addValidationError(errors, "secret", "A secret token is required")
  }

  const pathValue = searchParams.get("path")
  const path = pathValue && pathValue.trim().length > 0 ? pathValue.trim() : undefined

  const tagValue = searchParams.get("tag")
  const tag = tagValue && tagValue.trim().length > 0 ? tagValue.trim() : undefined

  const typeValue = searchParams.get("type")?.trim().toLowerCase()
  let type: RevalidateType = "all"
  if (typeValue) {
    if (REVALIDATE_TYPES.includes(typeValue as RevalidateType)) {
      type = typeValue as RevalidateType
    } else {
      addValidationError(errors, "type", "Type must be one of content, sitemaps, or all")
    }
  }

  if (hasValidationErrors(errors) || !secret) {
    throw new ValidationError("Invalid revalidation request", errors)
  }

  return { secret, path, tag, type }
}

export async function GET(request: NextRequest) {
  logRequest(request)
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "REVALIDATE_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const { searchParams } = new URL(request.url)

    // Validate query parameters
    const { secret, path, tag, type } = validateRevalidateParams(searchParams)

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
        revalidateByTag(tag)
        results.actions.push(`Revalidated tag: ${tag}`)
      }
      return withCors(request, successResponse(results))
    }

    // Handle bulk revalidation based on type
    if (type === "content" || type === "all") {
      // Revalidate main content paths
      const contentPaths = ["/", "/sport", "/entertainment", "/life", "/health", "/politics", "/food", "/opinion"]

      contentPaths.forEach((path) => {
        revalidatePath(path)
      })

      // Revalidate content tags
      const contentTags = [CACHE_TAGS.POSTS, CACHE_TAGS.CATEGORIES, CACHE_TAGS.FEATURED, CACHE_TAGS.TRENDING]
      contentTags.forEach((tag) => {
        revalidateByTag(tag)
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

    return withCors(request, successResponse(results))
  } catch (error) {
    return withCors(request, handleApiError(error))
  }
}
