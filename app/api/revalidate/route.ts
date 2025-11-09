import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { applyRateLimit, handleApiError, successResponse, withCors, logRequest } from "@/lib/api-utils"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { cacheTags } from "@/lib/cache"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
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

interface RevalidateParams {
  secret: string
  path?: string
  tag?: string
  type: RevalidateType
  country?: string
  tagSlug?: string
  categorySlug?: string
  postSlug?: string
  postId?: string
  sections: string[]
}

function validateRevalidateParams(searchParams: URLSearchParams): RevalidateParams {
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

  const countryValue = searchParams.get("country")
  const country = countryValue && countryValue.trim().length > 0 ? countryValue.trim().toLowerCase() : undefined

  const tagSlugValue = searchParams.get("tagSlug")
  const tagSlug = tagSlugValue && tagSlugValue.trim().length > 0 ? tagSlugValue.trim() : undefined

  const categorySlugValue = searchParams.get("categorySlug")
  const categorySlug =
    categorySlugValue && categorySlugValue.trim().length > 0 ? categorySlugValue.trim() : undefined

  const postSlugValue = searchParams.get("postSlug")
  const postSlug =
    postSlugValue && postSlugValue.trim().length > 0 ? postSlugValue.trim().toLowerCase() : undefined

  const postIdValue = searchParams.get("postId")
  const postId = postIdValue && postIdValue.trim().length > 0 ? postIdValue.trim() : undefined

  const sectionValues = searchParams.getAll("section")
  const sections = sectionValues
    .map((value) => value.trim())
    .filter((value): value is string => value.length > 0)
    .map((value) => value.toLowerCase())

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

  return { secret, path, tag, type, country, tagSlug, categorySlug, postSlug, postId, sections }
}

export async function GET(request: NextRequest) {
  logRequest(request)
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "REVALIDATE_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const { searchParams } = new URL(request.url)

    // Validate query parameters
    const { secret, path, tag, type, country, tagSlug, categorySlug, postSlug, postId, sections } =
      validateRevalidateParams(searchParams)

    if (secret !== process.env.REVALIDATION_SECRET) {
      throw new Error("Invalid revalidation secret")
    }

    const results: any = {
      revalidated: true,
      now: Date.now(),
      actions: [],
    }

    // Handle specific path or tag revalidation
    const targetedTags = new Set<string>()
    const targetedPaths: string[] = []

    if (path) {
      targetedPaths.push(path)
    }

    if (tag) {
      targetedTags.add(tag)
    }

    const resolvedCountry = country ?? DEFAULT_COUNTRY

    if (tagSlug) {
      targetedTags.add(cacheTags.tags(resolvedCountry))
      targetedTags.add(cacheTags.tag(resolvedCountry, tagSlug))
      buildCacheTags({ country: resolvedCountry, section: "tags", extra: [`tag:${tagSlug}`] }).forEach((cacheTag) =>
        targetedTags.add(cacheTag),
      )
    }

    if (categorySlug) {
      targetedTags.add(cacheTags.categories(resolvedCountry))
      targetedTags.add(cacheTags.category(resolvedCountry, categorySlug))
      buildCacheTags({ country: resolvedCountry, section: "categories", extra: [`category:${categorySlug}`] }).forEach(
        (cacheTag) => targetedTags.add(cacheTag),
      )
    }

    if (postSlug) {
      targetedTags.add(cacheTags.postSlug(resolvedCountry, postSlug))
    }

    if (postId) {
      targetedTags.add(cacheTags.post(resolvedCountry, postId))
    }

    const uniqueSections = Array.from(new Set(sections))
    uniqueSections.forEach((section) => {
      buildCacheTags({ country: resolvedCountry, section }).forEach((cacheTag) => targetedTags.add(cacheTag))
    })

    if (path || targetedTags.size > 0) {
      if (path) {
        targetedPaths.forEach((targetPath) => {
          revalidatePath(targetPath)
          results.actions.push(`Revalidated path: ${targetPath}`)
        })
      }
      if (targetedTags.size > 0) {
        targetedTags.forEach((cacheTag) => {
          revalidateByTag(cacheTag)
        })
        results.actions.push(
          `Revalidated tags: ${Array.from(targetedTags)
            .sort()
            .join(", ")}`,
        )
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
      const contentTags = [
        CACHE_TAGS.POSTS,
        CACHE_TAGS.CATEGORIES,
        CACHE_TAGS.FEATURED,
        CACHE_TAGS.TRENDING,
        CACHE_TAGS.TAGS,
      ]
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
