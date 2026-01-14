import type { NextRequest } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { applyRateLimit, handleApiError, successResponse, withCors, logRequest } from "@/lib/api-utils"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { cacheTags } from "@/lib/cache"
import { DEFAULT_COUNTRY, getArticleUrl } from "@/lib/utils/routing"
import { ValidationError, addValidationError, hasValidationErrors, type FieldErrors } from "@/lib/validation"

export const runtime = "nodejs"

// Cache policy: none (manual revalidation endpoint)
export const revalidate = 0

type RevalidateAction = "post_published" | "post_updated" | "post_deleted" | "category_updated"

type RevalidatePayload = {
  secret?: string
  slug?: string
  postId?: string | number
  country?: string
  categories?: string[]
  tags?: string[]
  path?: string
  sections?: string[]
  action?: RevalidateAction
  post_slug?: string
  category_slug?: string
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

  if (!secret && !process.env.REVALIDATION_SECRET) {
    addValidationError(errors, "secret", "A secret token is required")
  }

  const slug = normalizeString(payload.slug || payload.post_slug, { lowercase: true })
  const postId = normalizeString(payload.postId || payload.post_id)
  const country =
    normalizeString(payload.country, { lowercase: true }) ??
    process.env.NEXT_PUBLIC_DEFAULT_SITE?.toLowerCase() ??
    DEFAULT_COUNTRY
  const categories = normalizeArray(payload.categories, { lowercase: true })
  const tags = normalizeArray(payload.tags, { lowercase: true })
  const sections = normalizeArray(payload.sections, { lowercase: true })
  const path = normalizeString(payload.path)
  const action = normalizeString(payload.action, { lowercase: true }) as RevalidateAction | undefined
  const categorySlug = normalizeString(payload.category_slug, { lowercase: true })

  if (hasValidationErrors(errors)) {
    throw new ValidationError("Invalid revalidation request", errors)
  }

  return {
    secret,
    slug,
    postId,
    country,
    categories: categorySlug ? [...categories, categorySlug] : categories,
    tags,
    path,
    sections,
    action,
  }
}

function getTagsForAction(action: RevalidateAction, payload: RevalidatePayload): string[] {
  const { country = DEFAULT_COUNTRY, slug, postId } = payload
  const tagsToAdd: string[] = []

  switch (action) {
    case "post_published":
    case "post_updated":
      // Revalidate the specific post
      if (postId) {
        tagsToAdd.push(cacheTags.post(country, postId))
      }
      if (slug) {
        tagsToAdd.push(cacheTags.postSlug(country, slug))
      }
      // Revalidate home page and feed
      tagsToAdd.push(cacheTags.home(country))
      tagsToAdd.push(...buildCacheTags({ country, section: "home-feed" }))
      // Revalidate posts list
      tagsToAdd.push(cacheTags.posts(country))
      break

    case "post_deleted":
      // Revalidate the specific post and home
      if (postId) {
        tagsToAdd.push(cacheTags.post(country, postId))
      }
      if (slug) {
        tagsToAdd.push(cacheTags.postSlug(country, slug))
      }
      tagsToAdd.push(cacheTags.home(country))
      tagsToAdd.push(cacheTags.posts(country))
      break

    case "category_updated":
      // Revalidate the category and its posts
      if (payload.category_slug) {
        tagsToAdd.push(cacheTags.category(country, payload.category_slug))
      }
      tagsToAdd.push(cacheTags.categories(country))
      break
  }

  return tagsToAdd
}

export async function POST(request: NextRequest) {
  logRequest(request)
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "REVALIDATE_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const payload = parseRevalidatePayload(await request.json())
    const { secret, slug, postId, country = DEFAULT_COUNTRY, categories, tags, path, sections, action } = payload

    const headerSecret = request.headers.get("X-Revalidate-Secret")
    const providedSecret = headerSecret || secret

    if (providedSecret !== process.env.REVALIDATION_SECRET) {
      return withCors(
        request,
        new Response(JSON.stringify({ error: "Invalid revalidation secret" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
    }

    const tagsToRevalidate = new Set<string>()
    const pathsToRevalidate = new Set<string>()

    if (action) {
      getTagsForAction(action, payload).forEach((tag) => tagsToRevalidate.add(tag))
    } else {
      // Original logic: explicit tag-based revalidation
      tagsToRevalidate.add(cacheTags.posts(country))
      tagsToRevalidate.add(cacheTags.categories(country))
      tagsToRevalidate.add(cacheTags.tags(country))
    }

    if (slug) {
      tagsToRevalidate.add(cacheTags.postSlug(country, slug))
      pathsToRevalidate.add(getArticleUrl(slug, country))
    }

    if (postId) {
      tagsToRevalidate.add(cacheTags.post(country, postId))
    }

    categories.forEach((category) => {
      tagsToRevalidate.add(cacheTags.category(country, category))
    })

    tags.forEach((tag) => {
      tagsToRevalidate.add(cacheTags.tag(country, tag))
    })

    sections.forEach((section) => {
      buildCacheTags({ country, section }).forEach((cacheTag) => tagsToRevalidate.add(cacheTag))
    })

    if (path) {
      pathsToRevalidate.add(path)
    }

    pathsToRevalidate.forEach((targetPath) => {
      revalidatePath(targetPath)
    })

    tagsToRevalidate.forEach((cacheTag) => {
      revalidateTag(cacheTag)
    })

    const responsePayload = {
      revalidated: true,
      timestamp: new Date().toISOString(),
      paths: Array.from(pathsToRevalidate),
      tags: Array.from(tagsToRevalidate).sort(),
    }

    return withCors(request, successResponse(responsePayload))
  } catch (error) {
    return withCors(request, handleApiError(error))
  }
}
