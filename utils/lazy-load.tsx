const blurDataUrlCache = new Map<string, string>()

export function generateBlurDataURL(width = 700, height = 475, color = "#f3f4f6"): string {
  const cacheKey = `${width}|${height}|${color}`
  const cachedValue = blurDataUrlCache.get(cacheKey)

  if (cachedValue) {
    return cachedValue
  }

  const svg = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
      <text x="${width / 2}" y="${height / 2}" font-size="16" text-anchor="middle" alignment-baseline="middle" fill="#9ca3af">Loading...</text>
    </svg>
  `

  let base64: string

  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(svg).toString("base64")
  } else if (typeof globalThis.btoa === "function" && typeof TextEncoder !== "undefined") {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(svg)
    let binary = ""
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    base64 = globalThis.btoa(binary)
  } else {
    base64 = ""
  }

  const dataUrl = `data:image/svg+xml;base64,${base64}`
  blurDataUrlCache.set(cacheKey, dataUrl)

  return dataUrl
}

/**
 * Formats an image path to ensure it's properly referenced
 * @param path The image path
 * @returns Properly formatted image path
 */
export function formatImagePath(path: string): string {
  // If the path already starts with http/https, it's an external URL
  if (path.startsWith("http")) {
    return path
  }

  // Remove any '/public' prefix if it exists
  if (path.startsWith("/public/")) {
    return path.replace("/public", "")
  }

  // Ensure the path starts with a slash
  if (!path.startsWith("/")) {
    return `/${path}`
  }

  return path
}

/**
 * Creates a responsive image srcSet for different viewport sizes
 * @param basePath Base path of the image
 * @param sizes Array of sizes to generate
 * @returns Object with srcSet and sizes strings
 */
export function createResponsiveSrcSet(
  basePath: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920],
): { srcSet: string; sizes: string } {
  // Only works for images that support size parameters
  if (!basePath.includes("?") && !basePath.includes("placeholder")) {
    return {
      srcSet: "",
      sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    }
  }

  const srcSet = sizes.map((size) => `${basePath}&w=${size} ${size}w`).join(", ")

  return {
    srcSet,
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  }
}

// If you need lazyLoadComponent or lazyLoadSkeleton, import directly from './lazy-load-client'
