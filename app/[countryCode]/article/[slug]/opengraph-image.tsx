import { readFile } from "node:fs/promises"
import path from "node:path"

import { ImageResponse } from "next/og"
import { ENV } from "@/config/env"
import { resolveCountryOgBadge } from "@/lib/og/country-badge"
import { stripHtml } from "@/lib/search"

import {
  buildArticleCountryPriority,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeSlug,
  resolveEdition,
} from "./article-data"

export const runtime = "nodejs"
export const revalidate = 300
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

interface RouteParams {
  countryCode: string
  slug: string
}

const TITLE_MAX_LENGTH = 140

const fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif"

const assetCache = new Map<string, string | null>()

async function loadPublicAsset(assetPath: string): Promise<string | null> {
  const normalizedPath = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath
  const absolutePath = path.join(process.cwd(), "public", normalizedPath)

  if (assetCache.has(absolutePath)) {
    return assetCache.get(absolutePath) ?? null
  }

  try {
    const fileBuffer = await readFile(absolutePath)
    const extension = path.extname(absolutePath).slice(1).toLowerCase()
    const mimeType =
      extension === "svg"
        ? "image/svg+xml"
        : extension === "png"
          ? "image/png"
          : "application/octet-stream"

    const dataUri = `data:${mimeType};base64,${fileBuffer.toString("base64")}`
    assetCache.set(absolutePath, dataUri)
    return dataUri
  } catch {
    assetCache.set(absolutePath, null)
    return null
  }
}

function formatHeadline(title: string, excerpt: string): string {
  const source = title || excerpt || "Latest headlines from News On Africa"
  if (source.length <= TITLE_MAX_LENGTH) {
    return source
  }
  return `${source.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
}

export default async function Image({ params }: { params: RouteParams }): Promise<ImageResponse> {
  const { countryCode, slug } = params
  const edition = resolveEdition(countryCode)
  const normalizedCountry = edition
    ? edition.code.toLowerCase()
    : normalizeCountryCode(countryCode || ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const normalizedSlug = normalizeSlug(slug)

  const badge = resolveCountryOgBadge(normalizedCountry)
  const [badgeImage, logoImage] = await Promise.all([
    loadPublicAsset(badge.assetPath),
    loadPublicAsset("/news-on-africa-logo.png"),
  ])

  const countryPriority = buildArticleCountryPriority(normalizedCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)
  const post =
    resolvedArticle.status === "found"
      ? resolvedArticle.article
      : resolvedArticle.status === "temporary_error"
        ? resolvedArticle.staleArticle ?? null
        : resolvedArticle?.article ?? null
  const headline = formatHeadline(stripHtml(post?.title ?? ""), stripHtml(post?.excerpt ?? ""))

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          color: "#f8fafc",
          backgroundImage: `linear-gradient(135deg, ${badge.accentColor} 0%, #0f172a 55%, #020617 100%)`,
          borderRadius: "24px",
          fontFamily,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div
              style={{
                width: "112px",
                height: "112px",
                borderRadius: "56px",
                backgroundColor: "rgba(15, 23, 42, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px",
                boxShadow: "0 18px 38px rgba(2, 6, 23, 0.45)",
              }}
            >
              {badgeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={badgeImage}
                  alt={`${badge.label} badge`}
                  width={88}
                  height={88}
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: "56px" }}>{badge.flag}</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.01em" }}>News On Africa</span>
              <span style={{ fontSize: "24px", color: "rgba(241,245,249,0.8)", fontWeight: 500 }}>
                {badge.label} Edition
              </span>
            </div>
          </div>
          {logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoImage}
              alt="News On Africa"
              width={220}
              height={64}
              style={{ objectFit: "contain" }}
            />
          ) : null}
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            textShadow: "0 12px 26px rgba(2, 6, 23, 0.45)",
            wordBreak: "break-word",
          }}
        >
          {headline}
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    },
  )
}
