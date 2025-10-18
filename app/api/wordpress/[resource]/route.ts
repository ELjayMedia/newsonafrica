import { NextResponse } from "next/server"

import {
  loadCategoriesForCountry,
  loadCategoryHomePostsForCountry,
  loadCategoryPostsForCountry,
  loadFeaturedHomePosts,
  loadFeaturedPosts,
  loadLatestHomePostsForCountry,
  loadLatestPostsForCountry,
  loadPost,
  loadRelatedHomePostsForCountry,
  loadRelatedPostsForCountry,
} from "@/lib/wordpress/server-hooks"

import { DEFAULT_COUNTRY } from "@/lib/wordpress/shared"

export const runtime = "nodejs"
export const revalidate = 60

const DEFAULT_COUNTRY_CODE = (process.env.NEXT_PUBLIC_DEFAULT_SITE || DEFAULT_COUNTRY).toLowerCase()

type Handler = (request: Request, searchParams: URLSearchParams) => Promise<Response>

function resolveCountry(searchParams: URLSearchParams): string {
  const raw = searchParams.get("country")
  return raw ? raw.toLowerCase() : DEFAULT_COUNTRY_CODE
}

function parseLimit(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = searchParams.get(key)
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function json<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init)
}

const handlers: Record<string, Handler> = {
  "latest-posts": async (_request, searchParams) => {
    const country = resolveCountry(searchParams)
    const limit = parseLimit(searchParams, "limit", 20)
    const format = searchParams.get("format")

    if (format === "home") {
      const result = await loadLatestHomePostsForCountry(country, limit)
      return json(result)
    }

    const result = await loadLatestPostsForCountry(country, limit)
    return json(result)
  },
  "category-posts": async (_request, searchParams) => {
    const country = resolveCountry(searchParams)
    const category = searchParams.get("category")

    if (!category) {
      return json({ error: "Missing category" }, { status: 400 })
    }

    const limit = parseLimit(searchParams, "limit", 20)
    const format = searchParams.get("format")

    if (format === "home") {
      const result = await loadCategoryHomePostsForCountry(country, category, limit)
      return json(result)
    }

    const result = await loadCategoryPostsForCountry(country, category, limit)
    return json(result)
  },
  categories: async (_request, searchParams) => {
    const country = resolveCountry(searchParams)
    const categories = await loadCategoriesForCountry(country)
    return json(categories ?? [])
  },
  "featured-posts": async (_request, searchParams) => {
    const limit = parseLimit(searchParams, "limit", 10)
    const format = searchParams.get("format")

    if (format === "home") {
      const posts = await loadFeaturedHomePosts(limit)
      return json(posts)
    }

    const posts = await loadFeaturedPosts(limit)
    return json(posts ?? [])
  },
  post: async (_request, searchParams) => {
    const country = resolveCountry(searchParams)
    const slug = searchParams.get("slug")

    if (!slug) {
      return json({ error: "Missing slug" }, { status: 400 })
    }

    const post = await loadPost(country, slug)
    if (!post) {
      return json({ error: "Post not found" }, { status: 404 })
    }

    return json(post)
  },
  "related-posts": async (_request, searchParams) => {
    const country = resolveCountry(searchParams)
    const postId = searchParams.get("postId")

    if (!postId) {
      return json({ error: "Missing postId" }, { status: 400 })
    }

    const limit = parseLimit(searchParams, "limit", 6)
    const format = searchParams.get("format")

    if (format === "home") {
      const posts = await loadRelatedHomePostsForCountry(country, postId, limit)
      return json(posts)
    }

    const posts = await loadRelatedPostsForCountry(country, postId, limit)
    return json(posts ?? [])
  },
}

export async function GET(request: Request, { params }: { params: { resource: string } }) {
  const resource = params.resource
  const handler = handlers[resource]

  if (!handler) {
    return json({ error: "Unknown resource" }, { status: 404 })
  }

  try {
    const url = new URL(request.url)
    return await handler(request, url.searchParams)
  } catch (error) {
    console.error(`[v0] WordPress API proxy error for ${resource}`, error)
    return json({ error: "Internal error" }, { status: 500 })
  }
}
