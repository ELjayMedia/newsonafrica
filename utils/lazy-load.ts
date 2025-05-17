import dynamic from "next/dynamic"
import type { ComponentType } from "react"

/**
 * Generates a base64 blur data URL for image placeholders
 * @param width Width of the placeholder
 * @param height Height of the placeholder
 * @param color Optional background color (defaults to light gray)
 * @returns A base64 encoded SVG that can be used as a placeholder
 */
export function generateBlurDataURL(width = 700, height = 475, color = "#f3f4f6"): string {
  // Create a simple SVG with the specified dimensions
  const svg = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
      <text x="${width / 2}" y="${height / 2}" font-size="16" text-anchor="middle" alignment-baseline="middle" fill="#9ca3af">Loading...</text>
    </svg>
  `
  // Convert the SVG to a base64 data URL
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

/**
 * Helper function to lazy load components with a skeleton loading state
 * @param importFunc Function that imports the component
 * @param options Options for dynamic loading
 * @returns Dynamically loaded component with skeleton loading state
 */
export function lazyLoadComponent<T>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  options = { ssr: true },
) {
  return dynamic(importFunc, {
    ssr: options.ssr,
    loading: () => <div className="animate-pulse bg-gray-200 rounded-md h-full w-full min-h-[100px]"></div>,
  })
}

/**
 * Helper function to lazy load skeleton components with default loading state
 * @param importFunc Function that imports the skeleton component
 * @param options Options for dynamic loading
 * @returns Dynamically loaded skeleton component with fallback loading state
 */
export function lazyLoadSkeleton<T>(importFunc: () => Promise<{ default: ComponentType<T> }>, options = { ssr: true }) {
  return dynamic(importFunc, {
    ssr: options.ssr,
    loading: () => <div className="animate-pulse bg-gray-200 rounded-md h-full w-full min-h-[100px]"></div>,
  })
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
 * Checks if an image exists and returns a fallback if it doesn't
 * @param src The image source
 * @param fallback Fallback image path
 * @returns Promise resolving to the valid image path
 */
export async function checkImageExists(src: string, fallback = "/placeholder.svg"): Promise<string> {
  // If it's a data URL or SVG placeholder, return it directly
  if (src.startsWith("data:") || src.includes("placeholder")) {
    return src
  }

  // For external URLs, try to fetch the image
  if (src.startsWith("http")) {
    try {
      const response = await fetch(src, { method: "HEAD" })
      return response.ok ? src : fallback
    } catch (error) {
      console.error("Error checking image existence:", error)
      return fallback
    }
  }

  // For internal images, we'll assume they exist (can't check on client)
  // but ensure the path is formatted correctly
  return formatImagePath(src)
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
