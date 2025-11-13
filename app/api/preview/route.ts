import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { draftMode } from "next/headers"

export const runtime = "nodejs"
export const revalidate = 0

const PREVIEW_SECRET = process.env.WORDPRESS_PREVIEW_SECRET

const isValidSecret = (secret: string | null): boolean => {
  if (!PREVIEW_SECRET) {
    return false
  }

  if (!secret) {
    return false
  }

  return secret === PREVIEW_SECRET
}

const buildRedirectUrl = (request: NextRequest, countryCode: string, slug: string): URL => {
  const nextUrl = request.nextUrl.clone()
  nextUrl.pathname = `/${encodeURIComponent(countryCode)}/article/${encodeURIComponent(slug)}`
  nextUrl.search = ""
  nextUrl.hash = ""
  return nextUrl
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const secretParam = searchParams.get("secret")

  if (!isValidSecret(secretParam)) {
    return new NextResponse("Invalid preview secret", { status: 401 })
  }

  const countryCode = searchParams.get("countryCode")?.trim() || searchParams.get("country")?.trim()
  const slug = searchParams.get("slug")?.trim()

  if (!countryCode || !slug) {
    return new NextResponse("Both countryCode and slug parameters are required", { status: 400 })
  }

  draftMode().enable()

  const redirectUrl = buildRedirectUrl(request, countryCode, slug)

  return NextResponse.redirect(redirectUrl)
}
