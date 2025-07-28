// Utility functions for optimized lazy loading of images and components

/**
 * Generate a simple blurred SVG placeholder
 */
export function generateBlurDataURL(
  width = 700,
  height = 475,
  color = "#EEEEEE",
): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20" />
      </filter>
      <rect width="100%" height="100%" fill="${color}" />
      <rect width="100%" height="100%" fill="${color}" filter="url(#b)" />
    </svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

/**
 * Convenience helper for image component props
 */
export function getImageProps(src: string, width: number, height: number) {
  return {
    src,
    blurDataURL: generateBlurDataURL(width, height),
    placeholder: "blur" as const,
    loading: "lazy" as const,
  }
}

/**
 * Formats an image path to ensure it's properly referenced
 */
export function formatImagePath(path: string): string {
  if (path.startsWith("http")) {
    return path
  }

  if (path.startsWith("/public/")) {
    return path.replace("/public", "")
  }

  if (!path.startsWith("/")) {
    return `/${path}`
  }

  return path
}

/**
 * Creates a responsive image srcSet for different viewport sizes
 */
export function createResponsiveSrcSet(
  basePath: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920],
): { srcSet: string; sizes: string } {
  if (!basePath.includes("?") && !basePath.includes("placeholder")) {
    return {
      srcSet: "",
      sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    }
  }

  const srcSet = sizes
    .map((size) => `${basePath}&w=${size} ${size}w`)
    .join(", ")

  return {
    srcSet,
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  }
}

// Re-export the client-side lazy loading helpers
export { lazyLoadComponent, lazyLoadSkeleton } from "./lazy-load-client"
