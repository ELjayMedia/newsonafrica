const NITRO_CDN_HOST = "cdn-lfdfp.nitrocdn.com"
const WORDPRESS_PRIMARY_HOST = "newsonafrica.com"
const WORDPRESS_CDN_HOSTS = new Set(["i0.wp.com", "i1.wp.com", "i2.wp.com"])
const DEFAULT_QUALITY = 75

const protocolRegex = /^https?:\/\//i

function ensureAbsoluteUrl(src) {
  if (!src) {
    return null
  }

  let value = String(src).trim()
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

function resolveFromNitro(url) {
  const segments = url.pathname.split("/").filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  const host = segments.shift()
  if (!host) {
    return null
  }
  return { host, pathname: `/${segments.join("/")}` }
}

function resolveFromWordPressCdn(url) {
  const segments = url.pathname.split("/").filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  const derivedHost = segments.shift()
  if (!derivedHost) {
    return null
  }
  return { host: derivedHost, pathname: `/${segments.join("/")}` }
}

function resolveFromWordPress(url) {
  return { host: url.hostname, pathname: url.pathname }
}

function getAssetLocation(url) {
  if (url.hostname === NITRO_CDN_HOST) {
    return resolveFromNitro(url)
  }
  if (WORDPRESS_CDN_HOSTS.has(url.hostname)) {
    return resolveFromWordPressCdn(url)
  }
  if (url.hostname === WORDPRESS_PRIMARY_HOST || url.hostname.endsWith(`.${WORDPRESS_PRIMARY_HOST}`)) {
    return resolveFromWordPress(url)
  }
  return null
}

function buildNitroUrl(asset, { width, quality }) {
  const normalizedHost = String(asset.host)
    .replace(/^https?:\/\//, "")
    .replace(/\/+/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "")
  const trimmedPath = String(asset.pathname || "/").replace(/\/+/g, "/")
  const url = new URL(`https://${NITRO_CDN_HOST}/${normalizedHost}${trimmedPath}`)
  const params = new URLSearchParams()

  if (typeof width === "number" && Number.isFinite(width) && width > 0) {
    params.set("w", String(Math.floor(width)))
    const resolvedQuality =
      typeof quality === "number" && Number.isFinite(quality) && quality > 0
        ? Math.min(Math.floor(quality), 100)
        : DEFAULT_QUALITY
    params.set("q", String(resolvedQuality))
  } else if (typeof quality === "number" && Number.isFinite(quality) && quality > 0) {
    params.set("q", String(Math.min(Math.floor(quality), 100)))
  }

  const search = params.toString()
  url.search = search ? `?${search}` : ""
  return url.toString()
}

module.exports = function nitroImageLoader({ src, width, quality }) {
  const url = ensureAbsoluteUrl(src)
  if (!url) {
    return src
  }

  const asset = getAssetLocation(url)
  if (!asset) {
    const fallback = new URL(src, url.origin)
    if (typeof width === "number" && Number.isFinite(width) && width > 0) {
      fallback.searchParams.set("w", String(Math.floor(width)))
    }
    if (typeof quality === "number" && Number.isFinite(quality) && quality > 0) {
      fallback.searchParams.set("q", String(Math.floor(quality)))
    }
    return fallback.toString()
  }

  return buildNitroUrl(asset, { width, quality })
}
