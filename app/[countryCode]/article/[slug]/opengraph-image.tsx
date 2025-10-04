import { ImageResponse } from "next/og"
import { fetchFromWp, type WordPressPost } from "@/lib/wordpress-api"
import { wordpressQueries } from "@/lib/wordpress-queries"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { resolveCountryOgBadge } from "@/lib/og/country-badge"

export const runtime = "nodejs"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

interface RouteParams {
  countryCode: string
  slug: string
}

const TITLE_MAX_LENGTH = 140

const fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif"

async function loadPublicAsset(path: string): Promise<string | null> {
  try {
    const response = await fetch(new URL(`../../../../../public${path}`, import.meta.url))
    if (!response.ok) {
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const extension = path.endsWith(".svg")
      ? "svg+xml"
      : path.endsWith(".png")
        ? "png"
        : "octet-stream"

    return `data:image/${extension};base64,${buffer.toString("base64")}`
  } catch {
    return null
  }
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
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
  const country = (countryCode || "DEFAULT").toLowerCase()

  const badge = resolveCountryOgBadge(country)
  const [badgeImage, logoImage] = await Promise.all([
    loadPublicAsset(badge.assetPath),
    loadPublicAsset("/news-on-africa-logo.png"),
  ])

  let post: WordPressPost | null = null

  try {
    const cacheTags = buildCacheTags({
      country,
      section: "article",
      extra: [`post:${slug}`, `article:${slug}`],
    })

    const data =
      (await fetchFromWp<WordPressPost[]>(country, wordpressQueries.postBySlug(slug), { tags: cacheTags })) || []

    post = data[0] ?? null
  } catch {
    post = null
  }

  const headline = formatHeadline(stripHtml(post?.title), stripHtml(post?.excerpt))

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
