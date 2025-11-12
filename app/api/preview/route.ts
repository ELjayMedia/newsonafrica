import { NextRequest, NextResponse } from "next/server"
import { draftMode } from "next/headers"

import { ENV } from "@/config/env"

export const runtime = "nodejs"

const DEFAULT_REDIRECT_PATH = "/"

const sanitizePath = (input: string | null | undefined): string => {
  if (!input) {
    return DEFAULT_REDIRECT_PATH
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return DEFAULT_REDIRECT_PATH
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return DEFAULT_REDIRECT_PATH
  }

  const normalized = `/${trimmed.replace(/^\/+/, "")}`
  if (normalized.includes("://")) {
    return DEFAULT_REDIRECT_PATH
  }

  const sanitized = normalized.replace(/\.{2,}/g, "").replace(/\/+$/, "")
  return sanitized.length > 0 ? sanitized : DEFAULT_REDIRECT_PATH
}

const sanitizeSlug = (input: string | null | undefined): string | null => {
  if (!input) {
    return null
  }

  const trimmed = input.trim().replace(/^\/+|\/+$/g, "")
  if (!trimmed) {
    return null
  }

  if (!/^[A-Za-z0-9_\-/]+$/.test(trimmed)) {
    return null
  }

  return trimmed.toLowerCase()
}

const resolveCountrySegment = (input: string | null | undefined): string => {
  const defaultCountry = ENV.NEXT_PUBLIC_DEFAULT_SITE.toLowerCase()
  if (!input) {
    return defaultCountry
  }

  const trimmed = input.trim().toLowerCase()
  if (!trimmed) {
    return defaultCountry
  }

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return defaultCountry
  }

  return trimmed
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const secret = searchParams.get("secret")?.trim()

  if (!secret || secret !== ENV.WORDPRESS_PREVIEW_SECRET) {
    return NextResponse.json({ message: "Invalid preview secret" }, { status: 401 })
  }

  const slug = sanitizeSlug(searchParams.get("slug"))
  const country = resolveCountrySegment(searchParams.get("country"))
  const fallbackPath = sanitizePath(searchParams.get("fallback"))
  const explicitPath = sanitizePath(searchParams.get("path"))

  const redirectPath = slug
    ? `/${country}/article/${slug}`
    : explicitPath || fallbackPath

  draftMode().enable()

  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  response.headers.set("Cache-Control", "no-store")
  return response
}
