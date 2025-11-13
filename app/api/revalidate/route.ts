import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { applyRateLimit, handleApiError, successResponse, withCors, logRequest } from "@/lib/api-utils"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { cacheTags } from "@/lib/cache"
import { DEFAULT_COUNTRY, getArticleUrl } from "@/lib/utils/routing"
import {
  ValidationError,
  addValidationError,
  hasValidationErrors,
  type FieldErrors,
} from "@/lib/validation"

export const runtime = "nodejs"

// Cache policy: none (manual revalidation endpoint)
export const revalidate = 0

type RevalidatePayload = {
  secret?: string
  slug?: string
  postId?: string | number
  country?: string
  categories?: Array<string | number>
  tags?: Array<string | number>
  path?: string
  sections?: string[]
}

const normalizeString = (value: unknown, { lowercase = false } = {}): string | undefined => {
  if (typeof value === "string" || typeof value === "number") {
    const trimmed = String(value).trim()
    if (!trimmed) {
      return undefined
    }

    return lowercase ? trimmed.toLowerCase() : trimmed
  }

  return undefined
}

const normalizeArray = (value: unknown, { lowercase = false } = {}): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const values = value
    .map((item) => normalizeString(item, { lowercase }))
    .filter((item): item is string => Boolean(item))

  return Array.from(new Set(values))
}

function parseRevalidatePayload(body: unknown): RevalidatePayload {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Invalid revalidation request", {
      body: [{ message: "Request body must be a JSON object" }],
    })
  }

  const errors: FieldErrors = {}
  const payload = body as Record<string, unknown>

  const secret = normalizeString(payload.secret)
  if (!secret) {
    addValidationError(errors, "secret", "A secret token is required")
  }

  const slug = normalizeString(payload.slug, { lowercase: true })
  const postId = normalizeString(payload.postId)
  const country = normalizeString(payload.country, { lowercase: true })
  const categories = normalizeArray(payload.categories, { lowercase: true })
  const tags = normalizeArray(payload.tags, { lowercase: true })
  const sections = normalizeArray(payload.sections, { lowercase: true })
  const path = normalizeString(payload.path)

  if (hasValidationErrors(errors)) {
    throw new ValidationError("Invalid revalidation request", errors)
  }

  return { secret, slug, postId, country, categories, tags, path, sections }
}

export async function POST(request: NextRequest) {
  logRequest(request)
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "REVALIDATE_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const rawPayload = (await request.json()) as RevalidatePayload
    const payload = parseRevalidatePayload(rawPayload)
    const { secret, slug, postId, country, categories, tags, path, sections } = payload

    if (secret !== process.env.REVALIDATION_SECRET) {
      throw new Error("Invalid revalidation secret")
    }

    const fallbackCountry = process.env.NEXT_PUBLIC_DEFAULT_SITE?.toLowerCase() ?? DEFAULT_COUNTRY
    const normalizedCountry = country ?? fallbackCountry
    const normalizedSlug = slug ?? undefined
    const normalizedPostId = postId ? normalizeString(postId) : undefined
    const normalizedPath = path ?? undefined

    const tagsToRevalidate = new Set<string>()
    const pathsToRevalidate = new Set<string>()

    tagsToRevalidate.add(cacheTags.posts(normalizedCountry))

    if (normalizedSlug) {
      tagsToRevalidate.add(cacheTags.postSlug(normalizedCountry, normalizedSlug))
      pathsToRevalidate.add(getArticleUrl(normalizedSlug, normalizedCountry))
    }

    if (normalizedPostId) {
      tagsToRevalidate.add(cacheTags.post(normalizedCountry, normalizedPostId))
    }

    for (const category of categories) {
      tagsToRevalidate.add(cacheTags.category(normalizedCountry, category))
    }

    for (const tag of tags) {
      tagsToRevalidate.add(cacheTags.tag(normalizedCountry, tag))
    }

    for (const section of sections) {
      const sectionTags = buildCacheTags({ country: normalizedCountry, section })
      for (const cacheTag of sectionTags) {
        tagsToRevalidate.add(cacheTag)
      }
    }

    if (normalizedPath) {
      pathsToRevalidate.add(normalizedPath)
    }

    await Promise.all(Array.from(pathsToRevalidate, (targetPath) => revalidatePath(targetPath)))
    await Promise.all(Array.from(tagsToRevalidate, (cacheTag) => revalidateByTag(cacheTag)))

    const responsePayload = {
      revalidated: true,
      now: Date.now(),
      paths: Array.from(pathsToRevalidate),
      tags: Array.from(tagsToRevalidate).sort(),
    }

    return withCors(request, successResponse(responsePayload))
  } catch (error) {
    return withCors(request, handleApiError(error))
  }
}
