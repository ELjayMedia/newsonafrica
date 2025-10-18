const NITRO_CDN_HOST = "cdn-lfdfp.nitrocdn.com"
const WORDPRESS_PRIMARY_HOST = "newsonafrica.com"
const WORDPRESS_CDN_HOSTS = new Set(["i0.wp.com", "i1.wp.com", "i2.wp.com"])

export interface NitroUrlOptions {
  width?: number
  quality?: number
}

const DEFAULT_QUALITY = 75

const WORDPRESS_HOST_MATCHERS = [
  WORDPRESS_PRIMARY_HOST,
  `www.${WORDPRESS_PRIMARY_HOST}`,
]

const protocolRegex = /^https?:\/\//i

function ensureAbsoluteUrl(src: string): URL | null {
  if (!src) {
    return null
  }

  let value = src.trim()
  if (value.length === 0) {
    return null
  }

  if (value.startsWith("//")) {
    value = `https:${value}`
  }

  if (!protocolRegex.test(value)) {
    if (!value.startsWith("/")) {
      value = `/${value}`
    }
    value = `https://${WORDPRESS_PRIMARY_HOST}${value}`
  }

  try {
    return new URL(value)
  } catch {
    return null
  }
}

function resolveFromNitro(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  const host = segments.shift()!
  const pathname = `/${segments.join("/")}`
  return { host, pathname }
}

function resolveFromWordPressCdn(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  const derivedHost = segments.shift()
  if (!derivedHost) {
    return null
  }

  const pathname = `/${segments.join("/")}`
  return { host: derivedHost, pathname }
}

function resolveFromWordPress(url: URL) {
  return { host: url.hostname, pathname: url.pathname }
}

function getAssetLocation(url: URL) {
  if (url.hostname === NITRO_CDN_HOST) {
    return resolveFromNitro(url)
  }

  if (WORDPRESS_CDN_HOSTS.has(url.hostname)) {
    return resolveFromWordPressCdn(url)
  }

  if (WORDPRESS_HOST_MATCHERS.some((allowed) => url.hostname === allowed || url.hostname.endsWith(`.${allowed}`))) {
    return resolveFromWordPress(url)
  }

  return null
}

function buildNitroUrl(asset: { host: string; pathname: string }, options?: NitroUrlOptions) {
  const normalizedHost = asset.host.replace(/^https?:\/\//, "").replace(/\/+/g, "").replace(/[^a-zA-Z0-9.-]/g, "")
  const trimmedPath = asset.pathname.replace(/\/+/g, "/")
  const base = new URL(`https://${NITRO_CDN_HOST}/${normalizedHost}${trimmedPath}`)

  const params = new URLSearchParams()
  if (options?.width && Number.isFinite(options.width) && options.width > 0) {
    params.set("w", String(Math.floor(options.width)))
    const quality =
      typeof options.quality === "number" && Number.isFinite(options.quality) && options.quality > 0
        ? Math.min(Math.floor(options.quality), 100)
        : DEFAULT_QUALITY
    params.set("q", String(quality))
  } else if (typeof options?.quality === "number" && Number.isFinite(options.quality) && options.quality > 0) {
    params.set("q", String(Math.min(Math.floor(options.quality), 100)))
  }

  const search = params.toString()
  base.search = search ? `?${search}` : ""
  return base.toString()
}

export function getNitroCdnUrl(src: string, options?: NitroUrlOptions): string {
  const url = ensureAbsoluteUrl(src)
  if (!url) {
    return src
  }

  const asset = getAssetLocation(url)
  if (!asset) {
    if (options?.width || options?.quality) {
      const fallback = new URL(src, url.origin)
      if (options.width && Number.isFinite(options.width) && options.width > 0) {
        fallback.searchParams.set("w", String(Math.floor(options.width)))
      }
      if (options.quality && Number.isFinite(options.quality) && options.quality > 0) {
        fallback.searchParams.set("q", String(Math.floor(options.quality)))
      }
      return fallback.toString()
    }
    return src
  }

  return buildNitroUrl(asset, options)
}

export function ensureNitroCdnUrl(src: string | null | undefined, options?: NitroUrlOptions): string | undefined {
  if (!src) {
    return undefined
  }
  return getNitroCdnUrl(src, options)
}

export const nitroCdnHost = NITRO_CDN_HOST
export const wordpressPrimaryHost = WORDPRESS_PRIMARY_HOST
export const wordpressCdnHosts = WORDPRESS_CDN_HOSTS
