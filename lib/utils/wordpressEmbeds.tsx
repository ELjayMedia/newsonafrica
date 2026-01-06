import { decodeHtmlEntities } from "./decodeHtmlEntities"

export { decodeHtmlEntities }

export interface EmbedTransformer {
  name: string
  transform: (url: string) => string | null
}

const WRAPPER_REGEX = /<div[^>]*class="[^"]*wp-block-embed__wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function secondsFromYouTubeTimestamp(value: string | null): number | null {
  if (!value) {
    return null
  }

  const numeric = /^\d+$/.test(value) ? Number(value) : null
  if (numeric != null) {
    return numeric
  }

  const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i)
  if (!match) {
    return null
  }

  const [, hours, minutes, seconds] = match
  const totalSeconds =
    (hours ? Number(hours) * 3600 : 0) + (minutes ? Number(minutes) * 60 : 0) + (seconds ? Number(seconds) : 0)

  return totalSeconds > 0 ? totalSeconds : null
}

function buildIframeMarkup(src: string, title: string): string {
  const iframeAttributes = [
    `src="${src}"`,
    `title="${title}"`,
    'loading="lazy"',
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"',
    'referrerpolicy="strict-origin-when-cross-origin"',
    "allowfullscreen",
    'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"',
  ].join(" ")

  return [
    '<div class="wp-embed-responsive" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000;">',
    `<iframe ${iframeAttributes}></iframe>`,
    "</div>",
  ].join("")
}

const EMBED_TRANSFORMERS: EmbedTransformer[] = [
  {
    name: "youtube",
    transform: (url) => {
      const parsed = safeParseUrl(url)
      if (!parsed) {
        return null
      }

      const host = parsed.hostname.replace(/^www\./, "")
      if (host !== "youtube.com" && host !== "youtu.be" && host !== "m.youtube.com") {
        return null
      }

      let videoId: string | null = null

      if (host === "youtu.be") {
        videoId = parsed.pathname.slice(1) || null
      } else if (parsed.pathname.startsWith("/watch")) {
        videoId = parsed.searchParams.get("v")
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] ?? null
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2] ?? null
      }

      if (!videoId) {
        return null
      }

      const startParam = secondsFromYouTubeTimestamp(parsed.searchParams.get("t") ?? parsed.searchParams.get("start"))
      const params = new URLSearchParams()
      if (startParam != null) {
        params.set("start", String(startParam))
      }

      const embedUrl =
        `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` +
        (params.toString() ? `?${params.toString()}` : "")
      return buildIframeMarkup(embedUrl, "YouTube video player")
    },
  },
  {
    name: "twitter",
    transform: (url) => {
      const parsed = safeParseUrl(url)
      if (!parsed) {
        return null
      }

      const host = parsed.hostname.replace(/^www\./, "")
      if (host !== "twitter.com" && host !== "x.com") {
        return null
      }

      if (!/\/status\//.test(parsed.pathname)) {
        return null
      }

      const tweetUrl = parsed.toString()
      return [
        '<div class="wp-embed-responsive" style="max-width:550px;margin:0 auto;">',
        `<blockquote class="twitter-tweet"><a href="${tweetUrl}">${tweetUrl}</a></blockquote>`,
        "</div>",
      ].join("")
    },
  },
]

export function transformWordPressEmbeds(html: string): string {
  if (!html) {
    return html
  }

  return html.replace(WRAPPER_REGEX, (match, rawContent) => {
    const url = decodeHtmlEntities(rawContent.replace(/<[^>]+>/g, "").trim())

    if (!url) {
      return match
    }

    for (const transformer of EMBED_TRANSFORMERS) {
      const replacement = transformer.transform(url)
      if (replacement) {
        return match.replace(rawContent, replacement)
      }
    }

    return match
  })
}
